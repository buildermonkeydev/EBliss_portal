import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';


const FRONTEND_URL = 'https://nexus.buildermonkey.com';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private logger = new Logger(EmailService.name);
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.initializeTransporter();
    this.loadTemplates();
  }

  private initializeTransporter() {
    const host = this.configService.get('EMAIL_HOST');
    const port = parseInt(this.configService.get('EMAIL_PORT', '587'));
    const user = this.configService.get('EMAIL_USER');
    const pass = this.configService.get('EMAIL_PASSWORD');

    console.log('Email Config Debug:');
    console.log('EMAIL_HOST:', host);
    console.log('EMAIL_PORT:', port);
    console.log('EMAIL_USER:', user ? '***' : 'not set');
    console.log('EMAIL_FROM:', this.configService.get('EMAIL_FROM'));
    console.log('NODE_ENV:', process.env.NODE_ENV);

    if (!host || !user || !pass) {
      this.logger.warn('Email configuration incomplete. Emails will be logged to console.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('Email transporter verification failed:', error);
      } else {
        this.logger.log('Email transporter verified successfully');
      }
    });
  }

  private loadTemplates() {
    const templateDir = path.join(process.cwd(), 'src/auth/email-templates');
    
    try {
      const templates = ['verification', 'password-reset', 'password-changed', 'welcome'];
      
      templates.forEach(templateName => {
        const templatePath = path.join(templateDir, `${templateName}.html`);
        if (fs.existsSync(templatePath)) {
          const templateContent = fs.readFileSync(templatePath, 'utf-8');
          this.templates.set(templateName, handlebars.compile(templateContent));
          this.logger.log(`Loaded template: ${templateName}`);
        } else {
          this.logger.warn(`Template not found: ${templatePath}`);
        }
      });
    } catch (error) {
      this.logger.error('Failed to load email templates:', error);
    }
  }

  // ============ AUTH EMAILS ============

  async sendVerificationEmail(email: string, token: string, name: string) {
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;
    const year = new Date().getFullYear();

    const template = this.templates.get('verification');
    const html = template 
      ? template({ name, verificationUrl, year })
      : this.getVerificationEmailHTML(name, verificationUrl, year);

    await this.sendEmail(email, 'Verify Your Email Address', html);
  }

  async sendPasswordResetEmail(email: string, token: string, name: string) {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;
    const year = new Date().getFullYear();

    const template = this.templates.get('password-reset');
    const html = template
      ? template({ name, resetUrl, year })
      : this.getPasswordResetEmailHTML(name, resetUrl, year);

    await this.sendEmail(email, 'Reset Your Password', html);
  }

  async sendPasswordChangedEmail(email: string, name: string) {
    const year = new Date().getFullYear();

    const template = this.templates.get('password-changed');
    const html = template
      ? template({ name, year, loginUrl: `${this.configService.get('FRONTEND_URL')}/login` })
      : this.getPasswordChangedEmailHTML(name, year);

    await this.sendEmail(email, 'Your Password Has Been Changed', html);
  }

  async sendWelcomeEmail(email: string, name: string) {
    const year = new Date().getFullYear();

    const template = this.templates.get('welcome');
    const html = template
      ? template({
          name,
          year,
          dashboardUrl: `${this.configService.get('FRONTEND_URL')}/dashboard`,
          docsUrl: `${this.configService.get('FRONTEND_URL')}/docs`,
          supportUrl: `${this.configService.get('FRONTEND_URL')}/support`,
        })
      : this.getWelcomeEmailHTML(name, year);

    await this.sendEmail(email, 'Welcome to eBliss Cloud Platform', html);
  }

  // ============ TICKET EMAILS ============

  async sendTicketCreatedEmail(to: string, name: string, data: any) {
    const html = this.getTicketCreatedHTML(name, data);
    await this.sendEmail(to, `Ticket Created: ${data.ticketNumber}`, html);
  }

  async sendTicketReplyEmail(to: string, name: string, data: any) {
    const html = this.getTicketReplyHTML(name, data);
    await this.sendEmail(to, `Re: ${data.subject}`, html);
  }

  async sendTicketStatusUpdateEmail(to: string, name: string, data: any) {
    const html = this.getTicketStatusUpdateHTML(name, data);
    await this.sendEmail(to, `Ticket ${data.ticketNumber} Status Update`, html);
  }

  // ============ PAYMENT EMAILS ============

  async sendPaymentConfirmation(userId: number, amount: number, transactionId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) return;
    
    const html = this.getPaymentConfirmationHTML(user.full_name, amount, transactionId);
    await this.sendEmail(user.email, 'Payment Confirmation', html);
  }

  async sendPaymentFailedNotification(userId: number, amount: number, transactionId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) return;
    
    const html = this.getPaymentFailedHTML(user.full_name, amount, transactionId);
    await this.sendEmail(user.email, 'Payment Failed', html);
  }

  async sendRefundNotification(userId: number, amount: number, refundId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) return;
    
    const html = this.getRefundProcessedHTML(user.full_name, amount, refundId);
    await this.sendEmail(user.email, 'Refund Processed', html);
  }

  // ============ INVOICE EMAILS ============

  async sendInvoiceEmail(userId: number, invoiceNumber: string, amount: number, dueDate: Date) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) return;
    
    const html = this.getInvoiceHTML(user.full_name, invoiceNumber, amount, dueDate);
    await this.sendEmail(user.email, `Invoice ${invoiceNumber}`, html);
  }

  async sendInvoiceOverdueEmail(userId: number, invoiceNumber: string, amount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) return;
    
    const html = this.getInvoiceOverdueHTML(user.full_name, invoiceNumber, amount);
    await this.sendEmail(user.email, `Invoice ${invoiceNumber} Overdue`, html);
  }

  // ============ VM EMAILS ============

  async sendVMDeployedEmail(userId: number, vmName: string, vmId: number, ipAddress: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) return;
    
    const html = this.getVMDeployedHTML(user.full_name, vmName, vmId, ipAddress);
    await this.sendEmail(user.email, `VM Deployed: ${vmName}`, html);
  }

  async sendVMSuspendedEmail(userId: number, vmName: string, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) return;
    
    const html = this.getVMSuspendedHTML(user.full_name, vmName, reason);
    await this.sendEmail(user.email, `VM Suspended: ${vmName}`, html);
  }
// src/auth/services/email.service.ts

async sendCustomEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    await this.transporter.sendMail({
      from: this.configService.get('EMAIL_FROM') || 'noreply@ebliss.com',
      to,
      subject,
      html,
    });
    
    this.logger.log(`Custom email sent to ${to}: ${subject}`);
  } catch (error) {
    this.logger.error(`Failed to send custom email to ${to}:`, error);
    throw error;
  }
}
  // ============ PRIVATE METHODS ============

  private async sendEmail(to: string, subject: string, html: string) {
    if (!this.transporter && process.env.NODE_ENV !== 'production') {
      this.logger.log('=========================================');
      this.logger.log('DEVELOPMENT MODE - EMAIL WOULD BE SENT:');
      this.logger.log(`To: ${to}`);
      this.logger.log(`Subject: ${subject}`);
      this.logger.log('=========================================');
      return;
    }

    if (!this.transporter) {
      this.logger.error(`Cannot send email - transporter not configured. To: ${to}`);
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"eBliss Cloud" <${this.configService.get('EMAIL_FROM')}>`,
        to,
        subject,
        html,
        text: this.stripHtml(html),
      });
      this.logger.log(`Email sent to ${to}. Message ID: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

// ============ DEDICATED SERVER EMAILS ============

async sendServerAssignedEmail(email: string, serverName: string, userName: string) {
  const year = new Date().getFullYear();
  const dashboardUrl = `${this.configService.get('FRONTEND_URL')}/dedicated-servers`;
  
  const html = this.getServerAssignedHTML(userName, serverName, dashboardUrl, year);
  await this.sendEmail(email, `Dedicated Server Assigned: ${serverName}`, html);
}

async sendServerStatusChangeEmail(email: string, serverName: string, status: string) {
  const year = new Date().getFullYear();
  const dashboardUrl = `${this.configService.get('FRONTEND_URL')}/dedicated-servers`;
  
  const html = this.getServerStatusChangeHTML(serverName, status, dashboardUrl, year);
  await this.sendEmail(email, `Server Status Update: ${serverName}`, html);
}

async sendMaintenanceNotificationEmail(email: string, serverName: string, data: { 
  title: string; 
  description?: string; 
  start_at: Date; 
  end_at: Date;
}) {
  const year = new Date().getFullYear();
  const dashboardUrl = `${this.configService.get('FRONTEND_URL')}/dedicated-servers`;
  
  const html = this.getMaintenanceNotificationHTML(serverName, data, dashboardUrl, year);
  await this.sendEmail(email, `Maintenance Scheduled: ${serverName}`, html);
}

async sendServerProvisionedEmail(email: string, serverName: string, userName: string, serverDetails: any) {
  const year = new Date().getFullYear();
  const dashboardUrl = `${this.configService.get('FRONTEND_URL')}/dedicated-servers`;
  
  const html = this.getServerProvisionedHTML(userName, serverName, serverDetails, dashboardUrl, year);
  await this.sendEmail(email, `Server Provisioned: ${serverName}`, html);
}

async sendBandwidthAlertEmail(email: string, serverName: string, usagePercent: number, limitTb: number) {
  const year = new Date().getFullYear();
  const dashboardUrl = `${this.configService.get('FRONTEND_URL')}/dedicated-servers`;
  
  const html = this.getBandwidthAlertHTML(serverName, usagePercent, limitTb, dashboardUrl, year);
  await this.sendEmail(email, `⚠️ Bandwidth Alert: ${serverName}`, html);
}

// ============ COLOCATION EMAILS ============

async sendColocationAssignedEmail(email: string, userName: string, colocationDetails: any) {
  const year = new Date().getFullYear();
  const dashboardUrl = `${this.configService.get('FRONTEND_URL')}/colocation`;
  
  const html = this.getColocationAssignedHTML(userName, colocationDetails, dashboardUrl, year);
  await this.sendEmail(email, `Colocation Space Assigned`, html);
}

async sendColocationAccessGrantedEmail(email: string, userName: string, colocationDetails: any, accessDetails: any) {
  const year = new Date().getFullYear();
  
  const html = this.getColocationAccessGrantedHTML(userName, colocationDetails, accessDetails, year);
  await this.sendEmail(email, `Colocation Access Granted`, html);
}

// ============ HTML TEMPLATE GENERATORS ============

private getServerAssignedHTML(userName: string, serverName: string, dashboardUrl: string, year: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #F59E0B, #D97706); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .server-info { background: #e2e8f0; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .button { background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚀 Dedicated Server Assigned</h1>
        </div>
        <div class="content">
          <h2>Dear ${userName},</h2>
          <p>Your dedicated server has been successfully assigned and is ready for use.</p>
          <div class="server-info">
            <p><strong>Server Name:</strong> ${serverName}</p>
            <p><strong>Status:</strong> Provisioning</p>
          </div>
          <p>Our team is provisioning your server. This process typically takes 24-48 hours.</p>
          <p>You will receive another email when provisioning is complete.</p>
          <a href="${dashboardUrl}" class="button">View Server Details</a>
        </div>
        <div class="footer">
          <p>&copy; ${year} eBliss Cloud Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

private getServerStatusChangeHTML(serverName: string, status: string, dashboardUrl: string, year: number): string {
  const statusColors: Record<string, string> = {
    online: '#10B981',
    offline: '#64748B',
    maintenance: '#F59E0B',
    suspended: '#EF4444',
    error: '#EF4444',
  };
  
  const color = statusColors[status.toLowerCase()] || '#4F46E5';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .status-badge { display: inline-block; padding: 5px 15px; background: ${color}; color: white; border-radius: 20px; font-weight: bold; margin: 15px 0; }
        .button { background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Server Status Update</h1>
        </div>
        <div class="content">
          <p>Your server <strong>${serverName}</strong> status has changed.</p>
          <div class="status-badge">${status.toUpperCase()}</div>
          <a href="${dashboardUrl}" class="button">View Server</a>
        </div>
        <div class="footer">
          <p>&copy; ${year} eBliss Cloud Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

private getMaintenanceNotificationHTML(serverName: string, data: any, dashboardUrl: string, year: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8B5CF6, #6D28D9); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .maintenance-info { background: #e2e8f0; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .button { background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔧 Maintenance Scheduled</h1>
        </div>
        <div class="content">
          <p>Maintenance has been scheduled for your server <strong>${serverName}</strong>.</p>
          <div class="maintenance-info">
            <p><strong>Title:</strong> ${data.title}</p>
            ${data.description ? `<p><strong>Description:</strong> ${data.description}</p>` : ''}
            <p><strong>Start:</strong> ${new Date(data.start_at).toLocaleString()}</p>
            <p><strong>End:</strong> ${new Date(data.end_at).toLocaleString()}</p>
          </div>
          <p>Your server may experience downtime during this window.</p>
          <a href="${dashboardUrl}" class="button">View Details</a>
        </div>
        <div class="footer">
          <p>&copy; ${year} eBliss Cloud Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

private getServerProvisionedHTML(userName: string, serverName: string, serverDetails: any, dashboardUrl: string, year: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .server-details { background: #e2e8f0; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .credentials { background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #FCD34D; }
        .button { background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Server Provisioned!</h1>
        </div>
        <div class="content">
          <h2>Dear ${userName},</h2>
          <p>Your dedicated server <strong>${serverName}</strong> is now ready!</p>
          <div class="server-details">
            <p><strong>Hostname:</strong> ${serverDetails.hostname || serverName}</p>
            <p><strong>IP Address:</strong> ${serverDetails.ip_address || 'Pending'}</p>
            <p><strong>CPU:</strong> ${serverDetails.cpu_model || 'N/A'}</p>
            <p><strong>RAM:</strong> ${serverDetails.ram_gb || 0} GB</p>
            <p><strong>OS:</strong> ${serverDetails.os || 'N/A'}</p>
          </div>
          ${serverDetails.root_password ? `
          <div class="credentials">
            <p><strong>🔐 Root Password:</strong> ${serverDetails.root_password}</p>
            <p style="font-size: 12px; color: #92400E;">Please change this password upon first login.</p>
          </div>
          ` : ''}
          <a href="${dashboardUrl}" class="button">Access Server</a>
        </div>
        <div class="footer">
          <p>&copy; ${year} eBliss Cloud Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

private getBandwidthAlertHTML(serverName: string, usagePercent: number, limitTb: number, dashboardUrl: string, year: number): string {
  const color = usagePercent >= 95 ? '#EF4444' : '#F59E0B';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .usage-bar { background: #e2e8f0; height: 20px; border-radius: 10px; margin: 20px 0; overflow: hidden; }
        .usage-fill { background: ${color}; height: 100%; width: ${usagePercent}%; }
        .button { background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Bandwidth Alert</h1>
        </div>
        <div class="content">
          <p>Your server <strong>${serverName}</strong> is approaching its bandwidth limit.</p>
          <div class="usage-bar">
            <div class="usage-fill"></div>
          </div>
          <p style="text-align: center; font-size: 24px; font-weight: bold; color: ${color};">${usagePercent.toFixed(1)}%</p>
          <p><strong>Monthly Limit:</strong> ${limitTb} TB</p>
          <p>Consider upgrading your bandwidth plan to avoid overage charges.</p>
          <a href="${dashboardUrl}" class="button">Manage Bandwidth</a>
        </div>
        <div class="footer">
          <p>&copy; ${year} eBliss Cloud Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

private getColocationAssignedHTML(userName: string, colocationDetails: any, dashboardUrl: string, year: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #06B6D4, #0891B2); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .colocation-info { background: #e2e8f0; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .button { background: #06B6D4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏢 Colocation Space Assigned</h1>
        </div>
        <div class="content">
          <h2>Dear ${userName},</h2>
          <p>Your colocation space has been assigned.</p>
          <div class="colocation-info">
            <p><strong>Datacenter:</strong> ${colocationDetails.datacenter}</p>
            <p><strong>Rack:</strong> ${colocationDetails.rack_name || colocationDetails.rack_id}</p>
            <p><strong>Unit:</strong> ${colocationDetails.unit_position} (${colocationDetails.unit_size}U)</p>
            <p><strong>Power:</strong> ${colocationDetails.power_capacity_kw} kW</p>
          </div>
          <a href="${dashboardUrl}" class="button">View Details</a>
        </div>
        <div class="footer">
          <p>&copy; ${year} eBliss Cloud Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

private getColocationAccessGrantedHTML(userName: string, colocationDetails: any, accessDetails: any, year: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
        .access-info { background: #D1FAE5; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #6EE7B7; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔑 Access Granted</h1>
        </div>
        <div class="content">
          <h2>Dear ${userName},</h2>
          <p>Access has been granted for your colocation space.</p>
          <div class="access-info">
            <p><strong>Location:</strong> ${colocationDetails.datacenter} - ${colocationDetails.rack_name}</p>
            <p><strong>Unit:</strong> ${colocationDetails.unit_position}</p>
            <p><strong>Access Level:</strong> ${accessDetails.access_level || 'Full'}</p>
            <p><strong>Access Method:</strong> ${accessDetails.access_method || 'Keycard'}</p>
          </div>
          <p>Please bring valid ID on your first visit.</p>
        </div>
        <div class="footer">
          <p>&copy; ${year} eBliss Cloud Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

  private getTicketCreatedHTML(name: string, data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .ticket-info { background: #e2e8f0; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .button { background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
          .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Ticket Created</h1>
          </div>
          <div class="content">
            <h2>Dear ${name},</h2>
            <p>Your support ticket has been created successfully.</p>
            <div class="ticket-info">
              <p><strong>Ticket Number:</strong> ${data.ticketNumber}</p>
              <p><strong>Subject:</strong> ${data.subject}</p>
              <p><strong>Department:</strong> ${data.department}</p>
              <p><strong>Priority:</strong> ${data.priority}</p>
            </div>
            <p><strong>Description:</strong></p>
            <p>${data.description}</p>
            <p>Our support team will respond to you shortly.</p>
            <a href="${process.env.FRONTEND_URL}/support/${data.ticketNumber}" class="button">View Ticket</a>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} eBliss Cloud Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getTicketReplyHTML(name: string, data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .message-box { background: #e2e8f0; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .button { background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
          .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Reply on Ticket</h1>
          </div>
          <div class="content">
            <h2>Dear ${name},</h2>
            <p><strong>Ticket:</strong> ${data.ticketNumber}</p>
            <p><strong>Subject:</strong> ${data.subject}</p>
            <p><strong>Reply from:</strong> ${data.replyBy}</p>
            <div class="message-box">
              <p><strong>Message:</strong></p>
              <p>${data.message}</p>
            </div>
            <a href="${process.env.FRONTEND_URL}/support/${data.ticketNumber}" class="button">View Conversation</a>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} eBliss Cloud Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getTicketStatusUpdateHTML(name: string, data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .status-badge { display: inline-block; padding: 5px 10px; border-radius: 5px; font-weight: bold; }
          .status-open { background: #3b82f6; color: white; }
          .status-in-progress { background: #f59e0b; color: white; }
          .status-resolved { background: #10b981; color: white; }
          .status-closed { background: #64748b; color: white; }
          .button { background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
          .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Ticket Status Updated</h1>
          </div>
          <div class="content">
            <h2>Dear ${name},</h2>
            <p>Your ticket <strong>${data.ticketNumber}</strong> has been updated.</p>
            <p><strong>Subject:</strong> ${data.subject}</p>
            <p><strong>New Status:</strong> <span class="status-badge status-${data.status.toLowerCase()}">${data.status}</span></p>
            ${data.note ? `<p><strong>Note:</strong> ${data.note}</p>` : ''}
            <a href="${process.env.FRONTEND_URL}/support/${data.ticketNumber}" class="button">View Ticket</a>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} eBliss Cloud Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPaymentConfirmationHTML(name: string, amount: number, transactionId: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .amount { font-size: 32px; font-weight: bold; color: #10B981; text-align: center; margin: 20px 0; }
          .transaction-id { background: #e2e8f0; padding: 10px; border-radius: 6px; font-family: monospace; text-align: center; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Confirmation</h1>
          </div>
          <div class="content">
            <h2>Dear ${name},</h2>
            <p>Your payment has been successfully processed.</p>
            <div class="amount">₹${amount.toFixed(2)}</div>
            <div class="transaction-id">Transaction ID: ${transactionId}</div>
            <p>Your wallet has been credited with ₹${amount.toFixed(2)}.</p>
            <p>Thank you for using our services!</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} eBliss Cloud Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPaymentFailedHTML(name: string, amount: number, transactionId: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #EF4444, #DC2626); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Failed</h1>
          </div>
          <div class="content">
            <h2>Dear ${name},</h2>
            <p>Your payment of <strong>₹${amount.toFixed(2)}</strong> has failed.</p>
            <p><strong>Transaction ID:</strong> ${transactionId}</p>
            <p>Please try again or contact support if the issue persists.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} eBliss Cloud Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getRefundProcessedHTML(name: string, amount: number, refundId: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #F59E0B, #D97706); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Refund Processed</h1>
          </div>
          <div class="content">
            <h2>Dear ${name},</h2>
            <p>A refund of <strong>₹${amount.toFixed(2)}</strong> has been processed.</p>
            <p><strong>Refund ID:</strong> ${refundId}</p>
            <p>The amount has been deducted from your wallet balance.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} eBliss Cloud Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getInvoiceHTML(name: string, invoiceNumber: string, amount: number, dueDate: Date): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .amount { font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Invoice Generated</h1>
          </div>
          <div class="content">
            <h2>Dear ${name},</h2>
            <p>Your invoice <strong>${invoiceNumber}</strong> has been generated.</p>
            <div class="amount">₹${amount.toFixed(2)}</div>
            <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
            <p>Please ensure timely payment to avoid service interruption.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} eBliss Cloud Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getInvoiceOverdueHTML(name: string, invoiceNumber: string, amount: number): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #EF4444, #DC2626); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Invoice Overdue</h1>
          </div>
          <div class="content">
            <h2>Dear ${name},</h2>
            <p>Your invoice <strong>${invoiceNumber}</strong> of <strong>₹${amount.toFixed(2)}</strong> is now overdue.</p>
            <p>Please make the payment immediately to avoid service suspension.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} eBliss Cloud Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getVMDeployedHTML(name: string, vmName: string, vmId: number, ipAddress: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .vm-info { background: #e2e8f0; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>VM Deployed Successfully</h1>
          </div>
          <div class="content">
            <h2>Dear ${name},</h2>
            <p>Your virtual machine has been deployed successfully.</p>
            <div class="vm-info">
              <p><strong>Name:</strong> ${vmName}</p>
              <p><strong>ID:</strong> ${vmId}</p>
              <p><strong>IP Address:</strong> ${ipAddress}</p>
            </div>
            <a href="${process.env.FRONTEND_URL}/vps/${vmId}" class="button">Manage VM</a>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} eBliss Cloud Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getVMSuspendedHTML(name: string, vmName: string, reason: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #EF4444, #DC2626); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>VM Suspended</h1>
          </div>
          <div class="content">
            <h2>Dear ${name},</h2>
            <p>Your virtual machine <strong>${vmName}</strong> has been suspended.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p>Please contact support for more information.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} eBliss Cloud Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // ============ EXISTING HTML GENERATORS (Keep your existing ones) ============
  
  private getVerificationEmailHTML(name: string, verificationUrl: string, year: number): string {
    // Your existing HTML template
    return `
      <!DOCTYPE html>
      <html>
      <head><title>Verify Your Email</title></head>
      <body>
        <h2>Hello ${name},</h2>
        <p>Please verify your email by clicking the link below:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link expires in 24 hours.</p>
        <p>&copy; ${year} eBliss Cloud Platform</p>
      </body>
      </html>
    `;
  }

  private getPasswordResetEmailHTML(name: string, resetUrl: string, year: number): string {
    // Your existing HTML template
    return `
      <!DOCTYPE html>
      <html>
      <head><title>Reset Your Password</title></head>
      <body>
        <h2>Hello ${name},</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link expires in 1 hour.</p>
        <p>&copy; ${year} eBliss Cloud Platform</p>
      </body>
      </html>
    `;
  }

  private getPasswordChangedEmailHTML(name: string, year: number): string {
    // Your existing HTML template
    return `
      <!DOCTYPE html>
      <html>
      <head><title>Password Changed</title></head>
      <body>
        <h2>Hello ${name},</h2>
        <p>Your password has been successfully changed.</p>
        <p>If you did not make this change, please contact support immediately.</p>
        <p>&copy; ${year} eBliss Cloud Platform</p>
      </body>
      </html>
    `;
  }

  private getWelcomeEmailHTML(name: string, year: number): string {
    // Your existing HTML template
    return `
      <!DOCTYPE html>
      <html>
      <head><title>Welcome to eBliss</title></head>
      <body>
        <h2>Welcome ${name}!</h2>
        <p>Thank you for joining eBliss Cloud Platform.</p>
        <p>Get started by deploying your first virtual machine.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard">Go to Dashboard</a>
        <p>&copy; ${year} eBliss Cloud Platform</p>
      </body>
      </html>
    `;
  }
}