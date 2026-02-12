import nodemailer from "nodemailer";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  tls?: {
    rejectUnauthorized: boolean;
  };
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendOTPParams {
  to: string;
  name: string;
  otp: string;
}

interface SendForgotPasswordParams {
  to: string;
  name: string;
  resetLink: string;
}

interface SendCustomerWelcomeParams {
  to: string;
  name: string;
  email: string;
  password: string;
  domain: string;
  panelUrl: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
      tls: {
        rejectUnauthorized: false, // Accept self-signed certificates
      },
    });
  }

  /**
   * Send email
   */
  async sendEmail(params: SendEmailParams): Promise<boolean> {
    try {
      console.log("[EmailService] Attempting to send email to:", params.to);
      console.log("[EmailService] SMTP Config:", {
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        user: this.config.auth.user,
      });

      const info = await this.transporter.sendMail({
        from: '"LumiCloud Panel" <notify@lumicloud.my.id>',
        to: params.to,
        subject: params.subject,
        text: params.text || "",
        html: params.html,
        headers: {
          "X-Mailer": "LumiCloud Panel Mailer",
          "X-Priority": "1",
          "X-MSMail-Priority": "High",
          Importance: "high",
        },
      });

      console.log("[EmailService] Email sent successfully:", info.messageId);
      console.log("[EmailService] Response:", info.response);
      return true;
    } catch (error) {
      console.error("[EmailService] Email send error:", error);
      if (error instanceof Error) {
        console.error("[EmailService] Error message:", error.message);
        console.error("[EmailService] Error stack:", error.stack);
      }
      return false;
    }
  }

  /**
   * Send OTP email for login
   */
  async sendLoginOTP(params: SendOTPParams): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="X-UA-Compatible" content="ie=edge" />
          <title>Kode OTP Login - LumiCloud</title>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet" />
        </head>
        <body style="margin: 0; font-family: 'Poppins', sans-serif; background: #f8f9fa; font-size: 14px;">
          <div style="max-width: 680px; margin: 0 auto; padding: 45px 30px 60px; background: #f8f9fa; background-image: url('https://panel.lumicloud.my.id/images/email-bg.png'); background-repeat: no-repeat; background-size: 800px 452px; background-position: top center; font-size: 14px; color: #434343;">
            <header>
              <table style="width: 100%;">
                <tbody>
                  <tr style="height: 0;">
                    <td>
                      <img alt="LumiCloud Logo" src="https://panel.lumicloud.my.id/logos/logo.png" height="60px" style="border-radius: 8px;" />
                    </td>
                    <td style="text-align: right;">
                      <span style="font-size: 16px; line-height: 30px; color: #ffffff;">${new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </header>

            <main>
              <div style="margin: 0; margin-top: 70px; padding: 92px 30px 115px; background: #fff; border-radius: 30px; text-align: center; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
                <div style="width: 100%; max-width: 489px; margin: 0 auto;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f1f1f;">Kode OTP Login</h1>
                  <p style="margin: 0; margin-top: 17px; font-size: 16px; font-weight: 500;">Halo ${params.name},</p>
                  <p style="margin: 0; margin-top: 17px; font-weight: 500; letter-spacing: 0.56px; line-height: 1.6; color: #666666;">
                    Gunakan kode OTP berikut untuk login ke LumiCloud Panel Anda. Kode berlaku selama
                    <span style="font-weight: 600; color: #0090e6;">10 menit</span>.
                    Demi keamanan, jangan bagikan kode ini kepada siapa pun.
                  </p>
                  
                  <div style="margin: 40px 0; padding: 30px; background: linear-gradient(135deg, #f8f9ff 0%, #e8f2ff 100%); border-radius: 16px; border: 2px dashed #0090e6;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 500; color: #666666;">Kode OTP Login Anda:</p>
                    <p style="margin: 0; font-size: 42px; font-weight: 700; letter-spacing: 8px; color: #0090e6; font-family: 'Courier New', monospace;">
                      ${params.otp}
                    </p>
                  </div>

                  <div style="margin-top: 30px; padding: 20px; background: #fff5f5; border-radius: 12px; border-left: 4px solid #ef4444; text-align: left;">
                    <p style="margin: 0; font-size: 14px; color: #666666; font-weight: 500;">
                      <strong style="color: #ef4444;">PERINGATAN KEAMANAN:</strong><br>
                      • Kode OTP ini bersifat rahasia dan pribadi<br>
                      • Berlaku hanya selama 10 menit<br>
                      • Jangan bagikan kepada siapa pun, termasuk staff LumiCloud Panel<br>
                      • Jika tidak melakukan login, abaikan email ini
                    </p>
                  </div>
                </div>
              </div>

              <p style="max-width: 400px; margin: 0 auto; margin-top: 90px; text-align: center; font-weight: 500; color: #8c8c8c; font-size: 14px;">
                Mengalami masalah? Hubungi support kami di
                <a href="mailto:support@lumicloud.my.id" style="color: #0090e6; text-decoration: none;">support@lumicloud.my.id</a>
              </p>
            </main>

            <footer style="width: 100%; max-width: 490px; margin: 20px auto 0; text-align: center; border-top: 1px solid #e6ebf1;">
              <p style="margin: 0; margin-top: 40px; font-size: 16px; font-weight: 600; color: #434343;">LumiCloud Panel</p>
              <p style="margin: 0; margin-top: 16px; color: #434343; font-size: 12px;">Copyright © 2026 LumiCloud Panel. All rights reserved.</p>
            </footer>
          </div>
        </body>
      </html>
    `;

    const text = `
      Halo ${params.name},
      
      Kode OTP untuk login ke LumiCloud Panel Anda:
      
      ${params.otp}
      
      Kode berlaku selama 10 menit.
      Jangan bagikan kode ini kepada siapa pun.
      
      Salam,
      Tim LumiCloud Panel
    `;

    return this.sendEmail({
      to: params.to,
      subject: "Kode OTP Login - LumiCloud Panel",
      html,
      text,
    });
  }

  /**
   * Send OTP email for registration
   */
  async sendOTP(params: SendOTPParams): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="X-UA-Compatible" content="ie=edge" />
          <title>Verifikasi Email - LumiCloud Panel</title>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet" />
        </head>
        <body style="margin: 0; font-family: 'Poppins', sans-serif; background: #f8f9fa; font-size: 14px;">
          <div style="max-width: 680px; margin: 0 auto; padding: 45px 30px 60px; background: #f8f9fa; background-image: url(https://panel.lumicloud.my.id/images/email-bg.png); background-repeat: no-repeat; background-size: 800px 452px; background-position: top center; font-size: 14px; color: #434343;">
            <header>
              <table style="width: 100%;">
                <tbody>
                  <tr style="height: 0;">
                    <td>
                      <img alt="LumiCloud Panel Logo" src="https://panel.lumicloud.my.id/logos/logo.png" height="60px" style="border-radius: 8px;" />
                    </td>
                    <td style="text-align: right;">
                      <span style="font-size: 16px; line-height: 30px; color: #ffffff;">${new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </header>

            <main>
              <div style="margin: 0; margin-top: 70px; padding: 92px 30px 115px; background: #fff; border-radius: 30px; text-align: center; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
                <div style="width: 100%; max-width: 489px; margin: 0 auto;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 500; color: #1f1f1f;">Verifikasi Email Anda</h1>
                  <p style="margin: 0; margin-top: 17px; font-size: 16px; font-weight: 500;">Halo ${params.name},</p>
                  <p style="margin: 0; margin-top: 17px; font-weight: 500; letter-spacing: 0.56px; line-height: 1.6;">
                    Terima kasih telah memilih LumiCloud Panel untuk hosting website Anda. Gunakan kode OTP berikut untuk menyelesaikan proses verifikasi email. Kode berlaku selama
                    <span style="font-weight: 600; color: #0090e6;">10 menit</span>.
                    Jangan bagikan kode ini dengan orang lain, termasuk tim LumiCloud Panel.
                  </p>
                  <p style="margin: 0; margin-top: 60px; font-size: 40px; font-weight: 600; letter-spacing: 25px; color: #0090e6; background: linear-gradient(135deg, #0090e6 0%, #7b00e2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                    ${params.otp}
                  </p>
                  <div style="margin-top: 40px; padding: 20px; background: #f8f9ff; border-radius: 12px; border-left: 4px solid #ffc51a;">
                    <p style="margin: 0; font-size: 14px; color: #666666; font-weight: 500;">
                      <strong style="color: #ffc51a;">PERINGATAN KEAMANAN:</strong><br>
                      Kode OTP ini bersifat rahasia. Jika Anda tidak melakukan registrasi, abaikan email ini.
                    </p>
                  </div>
                </div>
              </div>

              <p style="max-width: 400px; margin: 0 auto; margin-top: 90px; text-align: center; font-weight: 500; color: #8c8c8c;">
                Butuh bantuan? Hubungi kami di
                <a href="mailto:support@lumicloud.my.id" style="color: #0090e6; text-decoration: none;">support@lumicloud.my.id</a>
                atau kunjungi
                <a href="https://lumicloud.my.id" target="_blank" style="color: #0090e6; text-decoration: none;">Website Kami</a>
              </p>
            </main>

            <footer style="width: 100%; max-width: 490px; margin: 20px auto 0; text-align: center; border-top: 1px solid #e6ebf1;">
              <p style="margin: 0; margin-top: 40px; font-size: 16px; font-weight: 600; color: #434343;">LumiCloud</p>
              <p style="margin: 0; margin-top: 16px; color: #434343; font-size: 12px;">Copyright © 2026 LumiCloud. All rights reserved.</p>
            </footer>
          </div>
        </body>
      </html>
    `;

    const text = `
      Halo ${params.name},
      
      Terima kasih telah mendaftar di LumiCloud Panel!
      
      Kode Verifikasi Anda: ${params.otp}
      Kode berlaku selama 10 menit.
      
      Jangan bagikan kode OTP ini kepada siapa pun.
      
      Salam,
      Tim LumiCloud Panel
    `;

    return this.sendEmail({
      to: params.to,
      subject: "Verifikasi Email - LumiCloud Panel",
      html,
      text,
    });
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcome(to: string, name: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="X-UA-Compatible" content="ie=edge" />
          <title>Selamat Datang - LumiCloud Panel</title>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet" />
        </head>
        <body style="margin: 0; font-family: 'Poppins', sans-serif; background: #f8f9fa; font-size: 14px;">
          <div style="max-width: 680px; margin: 0 auto; padding: 45px 30px 60px; background: #f8f9fa; background-image: url('https://panel.lumicloud.my.id/images/email-bg.png'); background-repeat: no-repeat; background-size: 800px 452px; background-position: top center; font-size: 14px; color: #434343;">
            <header>
              <table style="width: 100%;">
                <tbody>
                  <tr style="height: 0;">
                    <td>
                      <img alt="LumiCloud Logo" src="https://panel.lumicloud.my.id/logos/logo.png" height="60px" style="border-radius: 8px;" />
                    </td>
                    <td style="text-align: right;">
                      <span style="font-size: 16px; line-height: 30px; color: #ffffff;">${new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </header>

            <main>
              <div style="margin: 0; margin-top: 70px; padding: 92px 30px 115px; background: #ffffff; border-radius: 30px; text-align: center; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
                <div style="width: 100%; max-width: 489px; margin: 0 auto;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 500; color: #1f1f1f;">Selamat Datang di LumiCloud Panel!</h1>
                  <p style="margin: 0; margin-top: 17px; font-size: 16px; font-weight: 500;">Halo ${name},</p>
                  <p style="margin: 0; margin-top: 17px; font-weight: 500; letter-spacing: 0.56px; line-height: 1.6;">
                    Selamat! Akun LumiCloud Panel Anda telah berhasil diverifikasi dan aktif. Kami sangat senang Anda bergabung dengan komunitas hosting terpercaya kami.
                    Sekarang Anda dapat mulai membuat website impian Anda dengan layanan cloud hosting terbaik.
                  </p>

                  <div style="margin: 40px 0; padding: 20px; background: linear-gradient(135deg, #0090e6 0%, #7b00e2 100%); border-radius: 12px; color: white;">
                    <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #ffffff;">Email Berhasil Diverifikasi</h3>
                    <p style="margin: 0; font-size: 14px; opacity: 0.9;">Akun Anda sekarang siap digunakan untuk hosting website</p>
                  </div>

                  <div style="margin-top: 40px; text-align: center;">
                    <a href="https://panel.lumicloud.my.id/dashboard" style="display: inline-block; background: linear-gradient(135deg, #0090e6 0%, #7b00e2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(0, 144, 230, 0.3);">Masuk ke Dashboard</a>
                  </div>
                </div>
              </div>

              <p style="max-width: 400px; margin: 0 auto; margin-top: 90px; text-align: center; font-weight: 500; color: #8c8c8c;">
                Butuh bantuan? Tim support kami siap membantu 24/7 di
                <a href="mailto:support@lumicloud.my.id" style="color: #0090e6; text-decoration: none;">support@lumicloud.my.id</a>
              </p>
            </main>

            <footer style="width: 100%; max-width: 490px; margin: 20px auto 0; text-align: center; border-top: 1px solid #e6ebf1;">
              <p style="margin: 0; margin-top: 40px; font-size: 16px; font-weight: 600; color: #434343;">LumiCloud</p>
              <p style="margin: 0; margin-top: 16px; color: #434343; font-size: 12px;">Copyright © 2026 LumiCloud. All rights reserved.</p>
            </footer>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: "Selamat Datang di LumiCloud Panel",
      html,
    });
  }

  /**
   * Send welcome email to new customer with credentials
   */
  async sendCustomerWelcome(
    params: SendCustomerWelcomeParams,
  ): Promise<boolean> {
    const { to, name, email, password, domain, panelUrl } = params;

    const html = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="X-UA-Compatible" content="ie=edge" />
          <title>Selamat Datang - LumiCloud Panel</title>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet" />
        </head>
        <body style="margin: 0; font-family: 'Poppins', sans-serif; background: #f8f9fa; font-size: 14px;">
          <div style="max-width: 680px; margin: 0 auto; padding: 45px 30px 60px; background: #f8f9fa; background-image: url('https://panel.lumicloud.my.id/images/email-bg.png'); background-repeat: no-repeat; background-size: 800px 452px; background-position: top center; font-size: 14px; color: #434343;">
            <header>
              <table style="width: 100%;">
                <tbody>
                  <tr style="height: 0;">
                    <td>
                      <img alt="LumiCloud Logo" src="https://panel.lumicloud.my.id/logos/logo.png" height="60px" style="border-radius: 8px;" />
                    </td>
                    <td style="text-align: right;">
                      <span style="font-size: 16px; line-height: 30px; color: #ffffff;">${new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </header>

            <main>
              <div style="margin: 0; margin-top: 70px; padding: 92px 30px 115px; background: #ffffff; border-radius: 30px; text-align: center; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
                <div style="width: 100%; max-width: 489px; margin: 0 auto;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 500; color: #1f1f1f;">Selamat Datang di LumiCloud!</h1>
                  <p style="margin: 0; margin-top: 17px; font-size: 16px; font-weight: 500;">Halo ${name},</p>
                  <p style="margin: 0; margin-top: 17px; font-weight: 500; letter-spacing: 0.56px; line-height: 1.6;">
                    Akun hosting Anda telah berhasil dibuat! Website Anda sudah aktif dan siap digunakan. Berikut adalah informasi akses Anda untuk mengelola website dan panel kontrol.
                  </p>

                  <div style="margin: 40px 0; padding: 25px; background: #f8f9ff; border-radius: 12px; border: 2px solid #e3e8ff; text-align: left;">
                    <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #1f1f1f; text-align: center; font-weight: 600;">Informasi Akun Anda</h3>
                    
                    <div style="background: #ffffff; padding: 15px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #e3e8ff;">
                      <p style="margin: 0; font-size: 12px; color: #666666; font-weight: 600;">Email/Username</p>
                      <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 600; font-family: monospace; color: #1f1f1f;">${email}</p>
                    </div>
                    
                    <div style="background: #ffffff; padding: 15px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #e3e8ff;">
                      <p style="margin: 0; font-size: 12px; color: #666666; font-weight: 600;">Password</p>
                      <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 600; font-family: monospace; color: #1f1f1f;">${password}</p>
                    </div>
                    
                    <div style="background: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #e3e8ff;">
                      <p style="margin: 0; font-size: 12px; color: #666666; font-weight: 600;">Domain Anda</p>
                      <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 600; color: #1f1f1f;">
                        <a href="https://${domain}" style="color: #0090e6; text-decoration: none;">${domain}</a>
                      </p>
                    </div>
                  </div>

                  <div style="margin-top: 40px; text-align: center;">
                    <a href="${panelUrl}" style="display: inline-block; background: linear-gradient(135deg, #0090e6 0%, #7b00e2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(0, 144, 230, 0.3);">Login ke Panel</a>
                  </div>

                  <div style="margin-top: 40px; padding: 20px; background: #f8f9ff; border-radius: 12px; border-left: 4px solid #0090e6; text-align: left;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666; font-weight: 600;">Langkah Selanjutnya:</p>
                    <ul style="margin: 0; padding-left: 20px; color: #666666; font-size: 14px; line-height: 1.8;">
                      <li>Login ke panel menggunakan kredensial di atas</li>
                      <li>Upload file website Anda melalui File Manager</li>
                      <li>Kelola database, email, dan DNS di panel kontrol</li>
                      <li>Website Anda dapat diakses di <strong>${domain}</strong></li>
                    </ul>
                  </div>

                  <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 12px; border-left: 4px solid #ffc51a;">
                    <p style="margin: 0; font-size: 13px; color: #856404; font-weight: 500;">
                      <strong>PENTING:</strong> Simpan informasi login ini dengan aman. Kami merekomendasikan untuk mengganti password Anda setelah login pertama kali.
                    </p>
                  </div>
                </div>
              </div>

              <p style="max-width: 400px; margin: 0 auto; margin-top: 90px; text-align: center; font-weight: 500; color: #8c8c8c;">
                Butuh bantuan? Tim support kami siap membantu 24/7 di
                <a href="mailto:support@lumicloud.my.id" style="color: #0090e6; text-decoration: none;">support@lumicloud.my.id</a>
              </p>
            </main>

            <footer style="width: 100%; max-width: 490px; margin: 20px auto 0; text-align: center; border-top: 1px solid #e6ebf1;">
              <p style="margin: 0; margin-top: 40px; font-size: 16px; font-weight: 600; color: #434343;">LumiCloud</p>
              <p style="margin: 0; margin-top: 16px; color: #434343; font-size: 12px;">Copyright © 2026 LumiCloud. All rights reserved.</p>
            </footer>
          </div>
        </body>
      </html>
    `;

    const text = `
      Halo ${name},
      
      Selamat! Akun hosting LumiCloud Anda telah berhasil dibuat.
      
      INFORMASI AKUN:
      Email/Username: ${email}
      Password: ${password}
      Domain: ${domain}
      Panel URL: ${panelUrl}
      
      LANGKAH SELANJUTNYA:
      1. Login ke panel menggunakan kredensial di atas
      2. Upload file website Anda melalui File Manager
      3. Kelola database, email, dan DNS di panel kontrol
      4. Website Anda dapat diakses di https://${domain}
      
      PENTING: Simpan informasi login ini dengan aman. Kami merekomendasikan untuk mengganti password Anda setelah login pertama kali.
      
      Butuh bantuan? Hubungi kami di support@lumicloud.my.id
      
      Salam,
      Tim LumiCloud
    `;

    return this.sendEmail({
      to,
      subject: "Akun Hosting Anda Sudah Aktif - LumiCloud",
      html,
      text,
    });
  }

  /**
   * Send forgot password email with reset link
   */
  async sendForgotPassword(params: SendForgotPasswordParams): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="X-UA-Compatible" content="ie=edge" />
          <title>Reset Password - LumiCloud Panel</title>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet" />
        </head>
        <body style="margin: 0; font-family: 'Poppins', sans-serif; background: #f8f9fa; font-size: 14px;">
          <div style="max-width: 680px; margin: 0 auto; padding: 45px 30px 60px; background: #f8f9fa; background-image: url('https://panel.lumicloud.my.id/images/email-bg.png'); background-repeat: no-repeat; background-size: 800px 452px; background-position: top center; font-size: 14px; color: #434343;">
            <header>
              <table style="width: 100%;">
                <tbody>
                  <tr style="height: 0;">
                    <td>
                      <img alt="LumiCloud Logo" src="https://panel.lumicloud.my.id/logos/logo.png" height="60px" style="border-radius: 8px;" />
                    </td>
                    <td style="text-align: right;">
                      <span style="font-size: 16px; line-height: 30px; color: #ffffff;">${new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </header>

            <main>
              <div style="margin: 0; margin-top: 70px; padding: 92px 30px 115px; background: #fff; border-radius: 30px; text-align: center; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
                <div style="width: 100%; max-width: 489px; margin: 0 auto;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 500; color: #1f1f1f;">Reset Password Akun Anda</h1>
                  <p style="margin: 0; margin-top: 17px; font-size: 16px; font-weight: 500;">Halo ${params.name},</p>
                  <p style="margin: 0; margin-top: 17px; font-weight: 500; letter-spacing: 0.56px; line-height: 1.6;">
                    Kami menerima permintaan reset password untuk akun LumiCloud Panel Anda. Klik tombol di bawah ini untuk mengatur ulang password Anda. Link ini akan kedaluwarsa dalam
                    <span style="font-weight: 600; color: #0090e6;">1 jam</span>.
                  </p>
                  <div style="margin-top: 40px; text-align: center;">
                    <a href="${params.resetLink}" style="display: inline-block; background: linear-gradient(135deg, #0090e6 0%, #7b00e2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(0, 144, 230, 0.3);">Reset Password</a>
                  </div>
                  <div style="margin-top: 40px; padding: 20px; background: #f8f9ff; border-radius: 12px; border-left: 4px solid #ffc51a;">
                    <p style="margin: 0; font-size: 14px; color: #666666; font-weight: 500;">
                      <strong style="color: #ffc51a;">PERINGATAN KEAMANAN:</strong><br>
                      Jika Anda tidak meminta reset password, abaikan email ini dan segera hubungi support kami.
                    </p>
                  </div>
                  <p style="margin: 20px 0 0 0; font-size: 14px; color: #666666;">
                    Jika tombol tidak berfungsi, salin dan tempel link berikut ke browser Anda:<br>
                    <a href="${params.resetLink}" style="color: #0090e6; word-break: break-all;">${params.resetLink}</a>
                  </p>
                </div>
              </div>

              <p style="max-width: 400px; margin: 0 auto; margin-top: 90px; text-align: center; font-weight: 500; color: #8c8c8c;">
                Butuh bantuan? Hubungi kami di
                <a href="mailto:support@lumicloud.my.id" style="color: #0090e6; text-decoration: none;">support@lumicloud.my.id</a>
              </p>
            </main>

            <footer style="width: 100%; max-width: 490px; margin: 20px auto 0; text-align: center; border-top: 1px solid #e6ebf1;">
              <p style="margin: 0; margin-top: 40px; font-size: 16px; font-weight: 600; color: #434343;">LumiCloud</p>
              <p style="margin: 0; margin-top: 16px; color: #434343; font-size: 12px;">Copyright © 2026 LumiCloud. All rights reserved.</p>
            </footer>
          </div>
        </body>
      </html>
    `;

    const text = `
      Halo ${params.name},
      
      Permintaan reset password untuk akun LumiCloud Panel Anda telah diterima.
      
      Klik link berikut untuk reset password Anda:
      ${params.resetLink}
      
      Link ini akan kedaluwarsa dalam 1 jam.
      
      Jika Anda tidak meminta reset password, abaikan email ini.
      
      Salam,
      Tim LumiCloud Panel
    `;

    return this.sendEmail({
      to: params.to,
      subject: "Reset Password - LumiCloud Panel",
      html,
      text,
    });
  }
}

// Singleton instance
let emailServiceInstance: EmailService | null = null;

export const getEmailService = (): EmailService => {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService({
      host: process.env.SMTP_HOST || "notify.lumicloud.my.id",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "notify@lumicloud.my.id",
        pass: process.env.SMTP_PASS || "",
      },
      tls: {
        rejectUnauthorized: false, // Accept self-signed certificates
      },
    });
  }
  return emailServiceInstance;
};

/**
 * Generate random 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Get OTP expiry time (10 minutes from now)
 */
export function getOTPExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10);
  return expiry;
}
