import { Client } from 'ssh2';
import fs from 'fs';

const sshHost = process.env.HESTIA_SSH_HOST;
const sshUser = process.env.HESTIA_SSH_USER;
const sshPassword = process.env.HESTIA_SSH_PASSWORD;
const configPath = '/etc/cloudflared/config.yml';

export async function addCloudflaredDomain(domains: string[]) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      console.log('[CLOUDFLARED-SSH] SSH connection ready');
      // Step 1: Read config.yml
      conn.exec(`cat ${configPath}`, (err, stream) => {
        if (err) {
          console.error('[CLOUDFLARED-SSH] Error reading config:', err);
          return reject(err);
        }
        let configData = '';
        stream.on('data', (data: Buffer) => {
          configData += data.toString();
        });
        stream.on('close', () => {
          console.log('[CLOUDFLARED-SSH] Config read, editing...');
          // Step 2: Edit config.yml (add domains)
          let lines = configData.split('\n');
          let ingressIdx = lines.findIndex(l => l.trim().startsWith('ingress:'));
          if (ingressIdx === -1) {
            console.error('[CLOUDFLARED-SSH] Ingress not found');
            return reject('Ingress not found');
          }

          // Insert new hostnames before http_status:404
          let lastIdx = lines.findIndex(l => l.includes('http_status:404'));
          if (lastIdx === -1) lastIdx = lines.length;

          // Build new domain entries
          const domainEntries = domains.map(domain =>
            `  - hostname: ${domain}\n    service: http://192.168.1.80:80`
          );

          // Avoid duplicate entries
          domainEntries.forEach(entry => {
            if (!lines.some(l => l.includes(entry.split('\n')[0].trim()))) {
              lines.splice(lastIdx, 0, ...entry.split('\n'));
              lastIdx += entry.split('\n').length;
            }
          });

          const newConfig = lines.join('\n');
          console.log('[CLOUDFLARED-SSH] Writing new config...');

          // Step 3: Write new config.yml
          const tempPath = '/tmp/config.yml';
          conn.exec(`echo "${newConfig.replace(/"/g, '\"')}" > ${tempPath} && mv ${tempPath} ${configPath}`, (err2, stream2) => {
            if (err2) {
              console.error('[CLOUDFLARED-SSH] Error writing config:', err2);
              return reject(err2);
            }
            stream2.on('close', () => {
              console.log('[CLOUDFLARED-SSH] Config written, restarting tunnel...');
              // Step 4: Restart cloudflared
              conn.exec('sudo systemctl restart cloudflared', (err3, stream3) => {
                if (err3) {
                  console.error('[CLOUDFLARED-SSH] Error restarting tunnel:', err3);
                  return reject(err3);
                }
                stream3.on('close', () => {
                  console.log('[CLOUDFLARED-SSH] Tunnel restarted, done.');
                  conn.end();
                  resolve('Domain added and tunnel restarted');
                });
              });
            });
          });
        });
      });
    }).connect({
      host: sshHost,
      port: 22,
      username: sshUser,
      password: sshPassword,
    });
  });
}

// Usage example:
// await addCloudflaredDomain(['tripplaner.site', 'www.tripplaner.site']);
