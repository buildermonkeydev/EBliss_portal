// src/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards, Req, Res, HttpCode, HttpStatus, Get, Query } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.register(registerDto, ipAddress, userAgent);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.refreshToken(refreshTokenDto.refresh_token, ipAddress, userAgent);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: any, @Body() body: { refresh_token?: string }) {
    return this.authService.logout(user.id, body.refresh_token);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body('email') email: string) {
    return this.authService.resendVerificationEmail(email);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      changePasswordDto.current_password,
      changePasswordDto.new_password,
    );
  }

  // OAuth Routes
  @Get('google/url')
  async getGoogleAuthUrl() {
    return this.authService.getGoogleAuthUrl();
  }

  @Get('github/url')
  async getGithubAuthUrl() {
    return this.authService.getGithubAuthUrl();
  }

 @Get('google/callback')
async googleCallback(@Query('code') code: string, @Req() req: Request, @Res() res: Response) {
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  try {
    const result = await this.authService.handleGoogleCallback(code, ipAddress, userAgent);
    
    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL ;
    const redirectUrl = `${frontendUrl}/auth/callback?` + 
      `access_token=${result.access_token}&` +
      `refresh_token=${result.refresh_token}&` +
      `expires_in=${result.expires_in}&` +
      `user=${encodeURIComponent(JSON.stringify(result.user))}`;
    
    return res.redirect(redirectUrl);
  } catch (error) {
    // Redirect to frontend with error
    const frontendUrl = process.env.FRONTEND_URL ;
    return res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent(error.message)}`);
  }
}

@Get('github/callback')
async githubCallback(@Query('code') code: string, @Req() req: Request, @Res() res: Response) {
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  try {
    const result = await this.authService.handleGithubCallback(code, ipAddress, userAgent);
    
    // Redirect to frontend with tokens
    const frontendUrl = process.env.FRONTEND_URL ;
    const redirectUrl = `${frontendUrl}/auth/callback?` + 
      `access_token=${result.access_token}&` +
      `refresh_token=${result.refresh_token}&` +
      `expires_in=${result.expires_in}&` +
      `user=${encodeURIComponent(JSON.stringify(result.user))}`;
    
    return res.redirect(redirectUrl);
  } catch (error) {
    const frontendUrl = process.env.FRONTEND_URL ;
    return res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent(error.message)}`);
  }
}

  @Post('google/callback')
  @HttpCode(HttpStatus.OK)
  async googleCallbackPost(@Body('code') code: string, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.handleGoogleCallback(code, ipAddress, userAgent);
  }

  @Post('github/callback')
  @HttpCode(HttpStatus.OK)
  async githubCallbackPost(@Body('code') code: string, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.handleGithubCallback(code, ipAddress, userAgent);
  }

  @Post('oauth/link')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async linkOAuthAccount(
    @CurrentUser() user: any,
    @Body('provider') provider: string,
    @Body('code') code: string,
  ) {
    return this.authService.linkOAuthAccount(user.id, provider, code);
  }

  @Post('oauth/unlink')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unlinkOAuthAccount(
    @CurrentUser() user: any,
    @Body('provider') provider: string,
  ) {
    return this.authService.unlinkOAuthAccount(user.id, provider);
  }
}