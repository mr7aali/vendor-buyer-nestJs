🔐 1. URGENT SECURITY ACTION (DO THIS FIRST)
Change VPS root password
passwd
Create a new admin user (recommended)
adduser deploy
usermod -aG wheel deploy

Then stop using root for daily work.

🔐 Change PostgreSQL password again

Inside psql:

ALTER USER postgres WITH PASSWORD 'NEW_STRONG_PASSWORD';
ALTER USER ali WITH PASSWORD 'NEW_STRONG_PASSWORD';
⚠️ NEVER DO THIS AGAIN

❌ Don’t share:

root password
DB passwords
SSH credentials
Control panel login

Even in chat logs or tickets

📦 Now your REAL request: FULL DEPLOYMENT + FUTURE UPDATES DOC

I’ll give you a clean production-grade documentation (A → Z + updates flow)

🚀 NESTJS DEPLOYMENT (FULL GUIDE)
🖥️ 1. VPS LOGIN
ssh root@YOUR_VPS_IP

Control panel (not required for deployment):

https://YOUR_SERVER:2087
📦 2. INSTALL STACK
dnf install -y git nginx postgresql-server

Node.js:

curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

PM2:

npm install -g pm2
🗄️ 3. DATABASE SETUP
Init DB (only once)
postgresql-setup --initdb
systemctl enable postgresql
systemctl start postgresql
Create DB + user
su - postgres
psql
CREATE DATABASE dashboard;

CREATE USER ali WITH PASSWORD 'YOUR_PASSWORD';

GRANT ALL PRIVILEGES ON DATABASE dashboard TO ali;
📥 4. DEPLOY PROJECT (FIRST TIME)
cd /root
git clone https://github.com/your-repo.git
cd your-repo

Install:

npm install
🔐 5. ENV FILE
nano .env
DATABASE*URL="postgresql://ali:password@localhost:5432/dashboard"
JWT_SECRET="your_secret"
PORT=3000
🧬 6. PRISMA
npx prisma generate
npx prisma migrate deploy
🏗️ 7. BUILD PROJECT
npm run build
🚀 8. RUN WITH PM2
pm2 start dist/src/main.js --name dashboard
pm2 save
pm2 startup
🌐 9. NGINX CONFIG
nano /etc/nginx/conf.d/app.conf
server {
listen 80;
server_name *;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

}

Restart:

systemctl restart nginx
🌍 10. ACCESS
http://YOUR_VPS_IP
🔄 11. FUTURE UPDATES (VERY IMPORTANT)

When you change code locally → push to GitHub:

git add .
git commit -m "update"
git push
On server (DEPLOY UPDATE)
cd /root/your-repo

git pull origin main
npm install
npm run build
pm2 restart dashboard
🔥 12. ZERO-DOWNTIME BEST PRACTICE

Instead of restart:

pm2 reload dashboard
🧠 13. FULL SYSTEM FLOW
GitHub → VPS → NestJS → PM2 → Nginx → Internet
🔒 14. SECURITY BEST PRACTICE
Change all passwords immediately
Disable root SSH login
Use firewall:
firewall-cmd --permanent --add-service=http
firewall-cmd --reload
Install fail2ban:
dnf install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban
