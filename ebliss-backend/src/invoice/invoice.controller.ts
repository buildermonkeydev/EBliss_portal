// src/invoice/invoice.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles , AdminRole } from '../auth/decorators/roles.decorator';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  // USER ENDPOINTS
  @Get()
  @ApiOperation({ summary: 'Get all invoices for logged-in user' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'from_date', required: false })
  @ApiQuery({ name: 'to_date', required: false })
  async getUserInvoices(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
  ) {
    const userId = req.user.role === 'admin' || req.user.role === 'super' 
      ? undefined 
      : req.user.id;
    
    return this.invoiceService.getAllInvoices(
      userId,
      page,
      limit,
      status,
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
    );
  }

  @Get('stats')
  @Roles(AdminRole.SUPER_ADMIN,  AdminRole.ACCOUNTANT)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get invoice statistics (Admin only)' })
  async getInvoiceStats(
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
  ) {
    return this.invoiceService.getInvoiceStats(
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  async getInvoice(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const invoice = await this.invoiceService.getInvoiceById(id);
    
    if (req.user.role !== 'admin' && req.user.role !== 'super' && invoice.user_id !== req.user.id) {
      throw new Error('Unauthorized');
    }
    
    return invoice;
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download invoice PDF' })
  async downloadPDF(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @Res() res: Response,
  ) {
    const invoice = await this.invoiceService.getInvoiceById(id);
    
    if (req.user.role !== 'admin' && req.user.role !== 'super' && invoice.user_id !== req.user.id) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
    }
    
    if (invoice.pdf_url) {
      return res.json({ pdf_url: invoice.pdf_url });
    }
    
    const pdfPath = path.join(process.cwd(), 'uploads', 'invoices', `invoice_${id}_${invoice.user_id}.pdf`);
    
    if (fs.existsSync(pdfPath)) {
      return res.sendFile(pdfPath);
    } else {
      try {
        const pdfUrl = await this.invoiceService.generatePDF(invoice);
        return res.json({ pdf_url: pdfUrl });
      } catch (error) {
        return res.status(HttpStatus.NOT_FOUND).json({ message: 'PDF not found and could not be generated' });
      }
    }
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Pay invoice from wallet' })
  async payInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
  ) {
    const invoice = await this.invoiceService.getInvoiceById(id);
    
    if (invoice.user_id !== req.user.id) {
      throw new Error('Unauthorized');
    }
    
    if (invoice.status !== 'pending') {
      throw new Error('Invoice cannot be paid');
    }
    
    await this.invoiceService.updateInvoiceStatus(id, 'paid');
    
    return { 
      success: true, 
      message: 'Invoice paid successfully',
      invoice: await this.invoiceService.getInvoiceById(id)
    };
  }
// src/invoice/invoice.controller.ts - Add these endpoints

// ============ TESTING ENDPOINTS ============

@Post('test/generate-daily')
  @Roles(AdminRole.SUPER_ADMIN)
@UseGuards(RolesGuard)
@ApiOperation({ summary: 'Generate daily test invoice (Admin only)' })
async generateDailyTestInvoice(
  @Body('user_id') userId: number,
  @Body('date') date?: string,
) {
  const targetDate = date ? new Date(date) : new Date();
  const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);
  
  const invoice = await this.invoiceService.generateDailyInvoice(userId, startOfDay, endOfDay);
  return { success: true, invoice };
}

// ============ FIRST INVOICE ENDPOINTS ============

@Post('generate-first')
@ApiOperation({ summary: 'Generate first invoice for new user' })
async generateFirstInvoice(@Req() req) {
  const invoice = await this.invoiceService.generateFirstInvoice(req.user.id);
  return { success: true, invoice };
}

// ============ PAYMENT INVOICE ENDPOINTS ============

@Post('generate-payment')
@ApiOperation({ summary: 'Generate invoice for payment' })
async generatePaymentInvoice(
  @Req() req,
  @Body() paymentData: {
    amount: number;
    paymentId: string;
    paymentMethod: string;
    description?: string;
  },
) {
  const invoice = await this.invoiceService.generatePaymentInvoice(
    req.user.id,
    paymentData,
  );
  return { success: true, invoice };
}

// ============ SUBSCRIPTION INVOICE ENDPOINTS ============

@Post('generate-subscription')
@ApiOperation({ summary: 'Generate invoice for subscription start' })
async generateSubscriptionInvoice(
  @Req() req,
  @Body() subscriptionData: {
    planName: string;
    amount: number;
    vmId?: number;
    billingCycle: 'monthly' | 'yearly';
  },
) {
  const invoice = await this.invoiceService.generateSubscriptionStartInvoice(
    req.user.id,
    subscriptionData,
  );
  return { success: true, invoice };
}
  @Post(':id/email')
  @ApiOperation({ summary: 'Email invoice to user' })
  async emailInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
  ) {
    const invoice = await this.invoiceService.getInvoiceById(id);
    const user = await this.invoiceService['prisma'].user.findUnique({
      where: { id: invoice.user_id },
    });
    
    if (invoice.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super') {
      throw new Error('Unauthorized');
    }
    
    await this.invoiceService.sendInvoiceEmail(user, invoice);
    
    return { 
      success: true, 
      message: 'Invoice sent to email' 
    };
  }

  // ADMIN ENDPOINTS
  @Post('generate-monthly')
  @Roles(AdminRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Generate monthly invoice for user (Admin only)' })
  async generateMonthlyInvoice(
    @Body('user_id') userId: number,
    @Body('month') month?: string,
  ) {
    const invoice = await this.invoiceService.generateMonthlyInvoice(
      userId,
      month ? new Date(month) : undefined,
    );
    return invoice;
  }

  @Post('generate-all-monthly')
  @Roles(AdminRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Generate monthly invoices for all users (Admin only)' })
  async generateAllMonthlyInvoices() {
    const result = await this.invoiceService.generateAllMonthlyInvoices();
    return { 
      success: true,
      message: 'Monthly invoice generation completed',
      generated: result.generated,
      failed: result.failed
    };
  }

  @Post(':id/status')
  @Roles(AdminRole.SUPER_ADMIN,AdminRole.ACCOUNTANT)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update invoice status (Admin only)' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
    @Req() req,
  ) {
    return this.invoiceService.updateInvoiceStatus(id, status, req.user.id);
  }

  @Post(':id/void')
  @Roles(AdminRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Void invoice (Super admin only)' })
  async voidInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @Req() req,
  ) {
    return this.invoiceService.voidInvoice(id, req.user.id, reason);
  }

  @Post(':id/resend')
  @Roles(AdminRole.SUPER_ADMIN,  AdminRole.ACCOUNTANT)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Resend invoice email (Admin only)' })
  async resendInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
  ) {
    const invoice = await this.invoiceService.getInvoiceById(id);
    const user = await this.invoiceService['prisma'].user.findUnique({
      where: { id: invoice.user_id },
    });
    
    await this.invoiceService.sendInvoiceEmail(user, invoice);
    
    return { 
      success: true, 
      message: 'Invoice resent successfully' 
    };
  }
  // src/invoice/invoice.controller.ts - Add these endpoints

@Post('admin/create')
@Roles(AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT)
@UseGuards(RolesGuard)
@ApiOperation({ summary: 'Create custom invoice (Admin only)' })
async createCustomInvoice(
  @Body() data: {
    user_id: number;
    items: Array<{ description: string; quantity: number; unit_price: number }>;
    tax_rate?: number;
    due_date?: string;
  },
  @Req() req,
) {
  return this.invoiceService.createCustomInvoice(data, req.user.id);
}

@Post(':id/remind')
@Roles(AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT)
@UseGuards(RolesGuard)
@ApiOperation({ summary: 'Send payment reminder (Admin only)' })
async sendReminder(@Param('id', ParseIntPipe) id: number) {
  await this.invoiceService.sendPaymentReminder(id);
  return { success: true, message: 'Reminder sent successfully' };
}
}