import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
    private readonly logger = new Logger(FirebaseService.name);
    private messaging: admin.messaging.Messaging | null = null;

    onModuleInit() {
        const encoded = process.env.FIREBASE_SERVICE_ACCOUNT;

        if (!encoded) {
            this.logger.warn(
                'FIREBASE_SERVICE_ACCOUNT is not set – push notifications are disabled.',
            );
            return;
        }

        try {
            const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
            const serviceAccount: ServiceAccount = JSON.parse(decoded);

            // Only initialise once (guard against module hot-reload)
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
     * Returns the list of tokens that have been invalidated (expired / unregistered)
     * so the caller can remove them from the database.
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
