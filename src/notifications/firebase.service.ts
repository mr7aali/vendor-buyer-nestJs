import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
    private readonly logger = new Logger(FirebaseService.name);
    private messaging: admin.messaging.Messaging | null = null;

    onModuleInit() {
        try {
            let serviceAccount: ServiceAccount | null = null;

            // Strategy 1: load from a JSON credentials file on disk (preferred)
            const credFilePath = path.resolve(
                process.cwd(),
                'firebase-service-account.json',
            );
            if (fs.existsSync(credFilePath)) {
                const raw = fs.readFileSync(credFilePath, 'utf-8');
                serviceAccount = JSON.parse(raw) as ServiceAccount;
            }

            // Strategy 2: fall back to base64-encoded env var
            if (!serviceAccount) {
                const encoded = process.env.FIREBASE_SERVICE_ACCOUNT;
                if (encoded) {
                    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
                    serviceAccount = JSON.parse(decoded) as ServiceAccount;
                }
            }

            if (!serviceAccount) {
                this.logger.warn(
                    'No Firebase credentials found (firebase-service-account.json or ' +
                    'FIREBASE_SERVICE_ACCOUNT env var). Push notifications are disabled.',
                );
                return;
            }

            // Only initialise once (guard against hot-reload)
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
            }

            this.messaging = admin.messaging();
            this.logger.log('Firebase Admin SDK initialised successfully.');
        } catch (err) {
            this.logger.error('Failed to initialise Firebase Admin SDK', err);
        }
    }

    /**
     * Send a push notification to one or more FCM device tokens.
     * Returns the list of invalid tokens that should be deleted from the DB.
     */
    async sendToTokens(
        tokens: string[],
        title: string,
        body: string,
        data?: Record<string, string>,
    ): Promise<string[]> {
        if (!this.messaging || tokens.length === 0) {
            return [];
        }

        const invalidTokens: string[] = [];

        try {
            const response = await this.messaging.sendEachForMulticast({
                tokens,
                notification: { title, body },
                data,
                android: {
                    priority: 'high',
                    notification: { sound: 'default' },
                },
                apns: {
                    payload: {
                        aps: { sound: 'default', badge: 1 },
                    },
                },
            });

            response.responses.forEach((res, idx) => {
                if (!res.success) {
                    const code = res.error?.code ?? '';
                    if (
                        code === 'messaging/invalid-registration-token' ||
                        code === 'messaging/registration-token-not-registered'
                    ) {
                        invalidTokens.push(tokens[idx]);
                    } else {
                        this.logger.warn(
                            `FCM send error for token ${tokens[idx]}: ${res.error?.message}`,
                        );
                    }
                }
            });
        } catch (err) {
            this.logger.error('FCM multicast failed', err);
        }

        return invalidTokens;
    }
}
