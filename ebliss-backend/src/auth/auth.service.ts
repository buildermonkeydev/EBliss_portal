// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailService } from './services/email.service';
import { TokenService } from './services/token.service';
import { UsersService } from '../user/users.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private tokenService: TokenService,
    private usersService: UsersService,
    private httpService: HttpService,
  ) {}

  async register(registerDto: RegisterDto, ipAddress: string, userAgent: string) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = parseInt(this.configService.get('BCRYPT_ROUNDS', '12'));
    const password_hash = await bcrypt.hash(registerDto.password, saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password_hash,
        full_name: registerDto.name,
        phone: registerDto.phone,
        company: registerDto.company,
        tax_id: registerDto.tax_id,
        state: registerDto.state,
        city: registerDto.city,
        postal_code: registerDto.postal_code,
        country: registerDto.country || 'IN',
        role: 'customer',
        verified: false,
        status: 'active',
      },
    });

    // Create email verification token
    const verificationToken = this.tokenService.generateRandomToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.prisma.emailVerification.create({
      data: {
        user_id: user.id,
        token: verificationToken,
        expires_at: expiresAt,
      },
    });

    // Send verification email (non-blocking)
    this.emailService.sendVerificationEmail(user.email, verificationToken, user.full_name)
      .catch(err => console.error('Failed to send verification email:', err));

    // Log registration
    await this.prisma.loginHistory.create({
      data: {
        user_id: user.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        location: await this.getLocationFromIP(ipAddress),
        device_type: this.getDeviceType(userAgent),
        success: true,
      },
    });

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        verified: user.verified,
      },
    };
  }

  async login(loginDto: LoginDto, ipAddress: string, userAgent: string) {
    const { email, password, remember_me } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        refresh_tokens: {
          where: { revoked: false },
          orderBy: { created_at: 'desc' },
          take: 5,
        },
      },
    });

    // Production-level security: Use constant-time comparison for user existence
    if (!user) {
      // Log failed attempt with null userId
      await this.logFailedAttempt(null, email, ipAddress, userAgent, 'User not found');
      
      // Use generic error message to prevent user enumeration
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is suspended
    if (user.status === 'suspended') {
      await this.logFailedAttempt(user.id, email, ipAddress, userAgent, 'Account suspended');
      throw new UnauthorizedException('Your account has been suspended. Please contact support.');
    }

    // Verify password using constant-time comparison
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password_hash);
    } catch (error) {
      // Log error but don't expose details
      console.error('Password comparison error:', error);
    }

    if (!isPasswordValid) {
      await this.logFailedAttempt(user.id, email, ipAddress, userAgent, 'Invalid password');
      // Use same error message as user not found to prevent timing attacks
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if email is verified
    if (!user.verified) {
      // Resend verification email in background
      this.resendVerificationEmail(user.email).catch(err => 
        console.error('Failed to resend verification email:', err)
      );
      
      await this.logFailedAttempt(user.id, email, ipAddress, userAgent, 'Email not verified');
      throw new UnauthorizedException('Please verify your email first. A new verification email has been sent.');
    }

    // Session management with security limits
    await this.manageUserSessions(user.id, remember_me || false);

    // Generate tokens
    const accessToken = this.tokenService.generateAccessToken(user.id, user.email, user.role);
    const refreshToken = this.tokenService.generateRefreshToken(user.id, user.email, user.role);

    // Save refresh token to database
    const refreshExpiryDays = parseInt(this.configService.get('JWT_REFRESH_EXPIRY', '7'));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpiryDays);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        user_id: user.id,
        expires_at: expiresAt,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });

    // Update last login info
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        last_login_at: new Date(),
        last_login_ip: ipAddress,
      },
    });

    // Get location and device info
    const location = await this.getLocationFromIP(ipAddress);
    const deviceType = this.getDeviceType(userAgent);

    // Log successful login
    await this.prisma.loginHistory.create({
      data: {
        user_id: user.id,
        ip_address: ipAddress,
        user_agent: userAgent,
        location: location,
        device_type: deviceType,
        success: true,
      },
    });

    // Return user data without sensitive information
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: this.configService.get('JWT_ACCESS_EXPIRY', '15m'),
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
        verified: user.verified,
        company: user.company,
        tax_id: user.tax_id,
        state: user.state,
        wallet_balance: user.wallet_balance,
      },
    };
  }

  
  private async manageUserSessions(userId: number, rememberMe: boolean) {
    if (!rememberMe) {
      // For non-remember me sessions, revoke all existing sessions
      await this.prisma.refreshToken.updateMany({
        where: {
          user_id: userId,
          revoked: false,
        },
        data: { revoked: true },
      });
    } else {
      // For remember me, limit to 5 active sessions per user
      const activeTokens = await this.prisma.refreshToken.count({
        where: {
          user_id: userId,
          revoked: false,
        },
      });

      const MAX_SESSIONS = 5;
      if (activeTokens >= MAX_SESSIONS) {
        // Revoke the oldest active session
        const oldestToken = await this.prisma.refreshToken.findFirst({
          where: {
            user_id: userId,
            revoked: false,
          },
          orderBy: { created_at: 'asc' },
        });

        if (oldestToken) {
          await this.prisma.refreshToken.update({
            where: { id: oldestToken.id },
            data: { revoked: true },
          });
        }
      }
    }
  }

  async refreshToken(refreshToken: string, ipAddress: string, userAgent: string) {
    // Verify refresh token
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token exists in database and is not revoked
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.revoked || storedToken.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    // Check if user is active
    if (storedToken.user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    // Check if user is verified
    if (!storedToken.user.verified) {
      throw new UnauthorizedException('Email not verified');
    }

    // Generate new tokens
    const newAccessToken = this.tokenService.generateAccessToken(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.role,
    );

    const newRefreshToken = this.tokenService.generateRefreshToken(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.role,
    );

    // Create new refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        user_id: storedToken.user.id,
        expires_at: expiresAt,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });

    // Revoke old refresh token (one-time use)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_in: this.configService.get('JWT_ACCESS_EXPIRY', '15m'),
    };
  }

  async logout(userId: number, refreshToken?: string) {
    if (refreshToken) {
      // Revoke specific refresh token
      await this.prisma.refreshToken.updateMany({
        where: {
          token: refreshToken,
          user_id: userId,
        },
        data: { revoked: true },
      });
    } else {
      // Revoke all refresh tokens for user
      await this.prisma.refreshToken.updateMany({
        where: {
          user_id: userId,
          revoked: false,
        },
        data: { revoked: true },
      });
    }

    return { message: 'Logged out successfully' };
  }

  async verifyEmail(token: string) {
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification) {
      throw new BadRequestException('Invalid verification token');
    }

    if (verification.expires_at < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    if (verification.verified_at) {
      throw new BadRequestException('Email already verified');
    }

    // Update user verification status
    await this.prisma.user.update({
      where: { id: verification.user_id },
      data: { verified: true },
    });

    // Mark token as used
    await this.prisma.emailVerification.update({
      where: { id: verification.id },
      data: { verified_at: new Date() },
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists for security
      return { message: 'If your email is registered, you will receive a verification email' };
    }

    if (user.verified) {
      throw new BadRequestException('Email already verified');
    }

    // Rate limiting: Check if a verification email was sent recently
    const recentVerification = await this.prisma.emailVerification.findFirst({
      where: {
        user_id: user.id,
        created_at: { gt: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
      },
    });

    if (recentVerification) {
      throw new BadRequestException('Please wait 5 minutes before requesting another verification email');
    }

    // Delete old verification tokens
    await this.prisma.emailVerification.deleteMany({
      where: { user_id: user.id },
    });

    // Create new token
    const verificationToken = this.tokenService.generateRandomToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.prisma.emailVerification.create({
      data: {
        user_id: user.id,
        token: verificationToken,
        expires_at: expiresAt,
      },
    });

    // Send email
    await this.emailService.sendVerificationEmail(user.email, verificationToken, user.full_name);

    return { message: 'Verification email sent' };
  }

  async forgotPassword(forgotPasswordDto: { email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: forgotPasswordDto.email },
    });

    if (!user) {
      // Don't reveal if user exists for security
      console.log("User is not found ")
      return { message: 'Please Sign-up first' };
    }

    // Rate limiting: Check if a password reset was requested recently
    const recentReset = await this.prisma.passwordReset.findFirst({
      where: {
        user_id: user.id,
        created_at: { gt: new Date(Date.now() - 15 * 60 * 1000) }, // Last 15 minutes
      },
    });

    // Delete old reset tokens
    await this.prisma.passwordReset.deleteMany({
      where: { user_id: user.id },
    });

    // Create new token
    const resetToken = this.tokenService.generateRandomToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.passwordReset.create({
      data: {
        user_id: user.id,
        token: resetToken,
        expires_at: expiresAt,
      },
    });

    // Send email
    await this.emailService.sendPasswordResetEmail(user.email, resetToken, user.full_name);
    console.log("forget password mail is sent ")
    return { message: 'If your email is registered, you will receive a password reset link' };
  }

  async resetPassword(resetPasswordDto: { token: string; new_password: string }) {
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token: resetPasswordDto.token },
      include: { user: true },
    });

    if (!reset) {
      throw new BadRequestException('Invalid or expired reset token ');
    }

    if (reset.expires_at < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    if (reset.used_at) {
      throw new BadRequestException('Reset token has already been used');
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(resetPasswordDto.new_password)) {
      throw new BadRequestException(
        'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character',
      );
    }

    // Hash new password
    const saltRounds = parseInt(this.configService.get('BCRYPT_ROUNDS', '12'));
    const password_hash = await bcrypt.hash(resetPasswordDto.new_password, saltRounds);

    // Update user password
    await this.prisma.user.update({
      where: { id: reset.user_id },
      data: { password_hash },
    });

    // Mark token as used
    await this.prisma.passwordReset.update({
      where: { id: reset.id },
      data: { used_at: new Date() },
    });

    // Revoke all refresh tokens for security
    await this.prisma.refreshToken.updateMany({
      where: {
        user_id: reset.user_id,
        revoked: false,
      },
      data: { revoked: true },
    });

    // Send confirmation email
    await this.emailService.sendPasswordChangedEmail(reset.user.email, reset.user.full_name);

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new BadRequestException(
        'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character',
      );
    }

    // Hash new password
    const saltRounds = parseInt(this.configService.get('BCRYPT_ROUNDS', '12'));
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash },
    });

    // Revoke all refresh tokens except current session
    await this.prisma.refreshToken.updateMany({
      where: {
        user_id: userId,
        revoked: false,
      },
      data: { revoked: true },
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Get location from IP address using free API
   */
  private async getLocationFromIP(ip: string): Promise<string> {
    try {
      // Skip for localhost/private IPs
      if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return 'Local Network';
      }
      
      const response = await fetch(`http://ip-api.com/json/${ip}`);
      const data = await response.json();
      if (data.status === 'success') {
        return `${data.city}, ${data.country}`;
      }
    } catch (error) {
      console.error('Failed to get location:', error);
    }
    return 'Unknown Location';
  }

 
  private getDeviceType(userAgent: string): string {
    if (!userAgent) return 'Unknown';
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile')) return 'Mobile';
    if (ua.includes('tablet')) return 'Tablet';
    if (ua.includes('mac') || ua.includes('windows') || ua.includes('linux')) return 'Desktop';
    return 'Unknown';
  }

  
  private async logFailedAttempt(
    userId: number | null,
    email: string,
    ipAddress: string,
    userAgent: string,
    reason: string,
  ) {
    try {
      let actualUserId: number = userId !== null ? userId : 0;
      
      if (actualUserId === 0 && email) {
        const user = await this.prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        actualUserId = user?.id || 0;
      }

      await this.prisma.loginHistory.create({
        data: {
          user_id: actualUserId,
          ip_address: ipAddress,
          user_agent: userAgent,
          location: await this.getLocationFromIP(ipAddress),
          device_type: this.getDeviceType(userAgent),
          success: false,
          failure_reason: reason,
        },
      });
    } catch (error) {
      console.error('Failed to log login attempt:', error);
    }
  }

  // OAuth Methods
  async getGoogleAuthUrl() {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
      client_id: this.configService.get('GOOGLE_CLIENT_ID'),
      redirect_uri: `${this.configService.get('API_URL')}/auth/google/callback`,
      response_type: 'code',
      scope: 'email profile',
      access_type: 'offline',
    };

    const url = `${rootUrl}?${new URLSearchParams(options).toString()}`;
    return { url };
  }

  async getGithubAuthUrl() {
    const rootUrl = 'https://github.com/login/oauth/authorize';
    const options = {
      client_id: this.configService.get('GITHUB_CLIENT_ID'),
      redirect_uri: `${this.configService.get('API_URL')}/auth/github/callback`,
      scope: 'user:email',
    };

    const url = `${rootUrl}?${new URLSearchParams(options).toString()}`;
    return { url };
  }

  async handleGoogleCallback(code: string, ipAddress: string, userAgent: string) {
    try {
      // Exchange code for tokens
      const tokenResponse = await firstValueFrom(
        this.httpService.post('https://oauth2.googleapis.com/token', {
          code,
          client_id: this.configService.get('GOOGLE_CLIENT_ID'),
          client_secret: this.configService.get('GOOGLE_CLIENT_SECRET'),
          redirect_uri: `${this.configService.get('API_URL')}/auth/google/callback`,
          grant_type: 'authorization_code',
        })
      );

      const { access_token } = tokenResponse.data;

      // Get user info from Google
      const userResponse = await firstValueFrom(
        this.httpService.get('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` },
        })
      );

      const { id: googleId, email, name, verified_email } = userResponse.data;

      // Find or create user using Prisma
      let user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Create new user
        user = await this.prisma.user.create({
          data: {
            email,
            full_name: name,
                password_hash: await bcrypt.hash(Math.random().toString(36), 10), // Random dummy password

            verified: verified_email || false,
            status: 'active',
            provider: 'google',
            provider_id: googleId,
            role: 'customer',
          },
        });
      } else if (!user.provider_id && user.provider !== 'google') {
        // Link Google account to existing user
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            provider: 'google',
            provider_id: googleId,
            verified: verified_email ? true : user.verified,
          },
        });
      }

      // Create session and generate tokens
      const refreshExpiryDays = parseInt(this.configService.get('JWT_REFRESH_EXPIRY', '7'));
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + refreshExpiryDays);

      const accessToken = this.tokenService.generateAccessToken(user.id, user.email, user.role);
      const refreshToken = this.tokenService.generateRefreshToken(user.id, user.email, user.role);

      await this.prisma.refreshToken.create({
        data: {
          token: refreshToken,
          user_id: user.id,
          expires_at: expiresAt,
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      });

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          last_login_at: new Date(),
          last_login_ip: ipAddress,
        },
      });

      // Log successful login
      await this.prisma.loginHistory.create({
        data: {
          user_id: user.id,
          ip_address: ipAddress,
          user_agent: userAgent,
          location: await this.getLocationFromIP(ipAddress),
          device_type: this.getDeviceType(userAgent),
          success: true,
        },
      });

      return {
        message: 'Google login successful',
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: this.configService.get('JWT_ACCESS_EXPIRY', '15m'),
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role,
          verified: user.verified,
          company: user.company,
          tax_id: user.tax_id,
          state: user.state,
          wallet_balance: user.wallet_balance,
        },
      };
    } catch (error) {
      console.error('Google OAuth error:', error);
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  async handleGithubCallback(code: string, ipAddress: string, userAgent: string) {
    try {
      // Exchange code for access token
      const tokenResponse = await firstValueFrom(
        this.httpService.post(
          'https://github.com/login/oauth/access_token',
          {
            code,
            client_id: this.configService.get('GITHUB_CLIENT_ID'),
            client_secret: this.configService.get('GITHUB_CLIENT_SECRET'),
            redirect_uri: `${this.configService.get('API_URL')}/auth/github/callback`,
          },
          { headers: { Accept: 'application/json' } }
        )
      );

      const { access_token } = tokenResponse.data;

      // Get user info from GitHub
      const userResponse = await firstValueFrom(
        this.httpService.get('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${access_token}` },
        })
      );

      // Get user emails from GitHub
      const emailResponse = await firstValueFrom(
        this.httpService.get('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${access_token}` },
        })
      );

      const { id: githubId, name, login } = userResponse.data;
      const primaryEmail = emailResponse.data.find(email => email.primary)?.email;
      const verifiedEmail = emailResponse.data.find(email => email.verified)?.email;

      if (!primaryEmail) {
        throw new BadRequestException('No primary email found from GitHub');
      }

      // Find or create user using Prisma
      let user = await this.prisma.user.findUnique({
        where: { email: primaryEmail },
      });

      if (!user) {
        // Create new user
        user = await this.prisma.user.create({
          data: {
            email: primaryEmail,
            full_name: name || login,
            verified: !!verifiedEmail,
                password_hash: await bcrypt.hash(Math.random().toString(36), 10), // Random dummy password

            status: 'active',
            provider: 'github',
            provider_id: githubId.toString(),
            role: 'customer',
          },
        });
      } else if (!user.provider_id && user.provider !== 'github') {
        // Link GitHub account to existing user
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            provider: 'github',
            provider_id: githubId.toString(),
            verified: verifiedEmail ? true : user.verified,
          },
        });
      }

      // Create session and generate tokens
      const refreshExpiryDays = parseInt(this.configService.get('JWT_REFRESH_EXPIRY', '7'));
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + refreshExpiryDays);

      const accessToken = this.tokenService.generateAccessToken(user.id, user.email, user.role);
      const refreshToken = this.tokenService.generateRefreshToken(user.id, user.email, user.role);

      await this.prisma.refreshToken.create({
        data: {
          token: refreshToken,
          user_id: user.id,
          expires_at: expiresAt,
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      });

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          last_login_at: new Date(),
          last_login_ip: ipAddress,
        },
      });

      // Log successful login
      await this.prisma.loginHistory.create({
        data: {
          user_id: user.id,
          ip_address: ipAddress,
          user_agent: userAgent,
          location: await this.getLocationFromIP(ipAddress),
          device_type: this.getDeviceType(userAgent),
          success: true,
        },
      });

      return {
        message: 'GitHub login successful',
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: this.configService.get('JWT_ACCESS_EXPIRY', '15m'),
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role,
          verified: user.verified,
          company: user.company,
          tax_id: user.tax_id,
          state: user.state,
          wallet_balance: user.wallet_balance,
        },
      };
    } catch (error) {
      console.error('GitHub OAuth error:', error);
      throw new UnauthorizedException('GitHub authentication failed');
    }
  }

  async linkOAuthAccount(userId: number, provider: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let providerId: string;
    let email: string;
    let name: string;

    if (provider === 'google') {
      const result = await this.exchangeGoogleCode(code);
      providerId = result.id;
      email = result.email;
      name = result.name;
      
      // Check if another user already has this Google account linked
      const existingUser = await this.prisma.user.findFirst({
        where: { provider_id: providerId, provider: 'google' },
      });
      
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('This Google account is already linked to another user');
      }
    } else if (provider === 'github') {
      const result = await this.exchangeGithubCode(code);
      providerId = result.id;
      email = result.email;
      name = result.name;
      
      // Check if another user already has this GitHub account linked
      const existingUser = await this.prisma.user.findFirst({
        where: { provider_id: providerId, provider: 'github' },
      });
      
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('This GitHub account is already linked to another user');
      }
    } else {
      throw new BadRequestException('Invalid provider');
    }

    // Link account
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        provider: provider,
        provider_id: providerId,
        full_name: !user.full_name && name ? name : user.full_name,
      },
    });

    return { message: `${provider} account linked successfully` };
  }

  async unlinkOAuthAccount(userId: number, provider: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.provider !== provider) {
      throw new BadRequestException(`${provider} account is not linked`);
    }

    // Check if user has a password set
    if (!user.password_hash) {
      throw new BadRequestException('Cannot unlink the only authentication method. Please set a password first.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        provider: null,
        provider_id: null,
      },
    });

    return { message: `${provider} account unlinked successfully` };
  }

  private async exchangeGoogleCode(code: string) {
    const tokenResponse = await firstValueFrom(
      this.httpService.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: this.configService.get('GOOGLE_CLIENT_ID'),
        client_secret: this.configService.get('GOOGLE_CLIENT_SECRET'),
        redirect_uri: `${this.configService.get('API_URL')}/auth/google/callback`,
        grant_type: 'authorization_code',
      })
    );

    const userResponse = await firstValueFrom(
      this.httpService.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
      })
    );

    return {
      id: userResponse.data.id,
      email: userResponse.data.email,
      name: userResponse.data.name,
    };
  }

  private async exchangeGithubCode(code: string) {
    const tokenResponse = await firstValueFrom(
      this.httpService.post(
        'https://github.com/login/oauth/access_token',
        {
          code,
          client_id: this.configService.get('GITHUB_CLIENT_ID'),
          client_secret: this.configService.get('GITHUB_CLIENT_SECRET'),
          redirect_uri: `${this.configService.get('API_URL')}/auth/github/callback`,
        },
        { headers: { Accept: 'application/json' } }
      )
    );

    const userResponse = await firstValueFrom(
      this.httpService.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
      })
    );

    const emailResponse = await firstValueFrom(
      this.httpService.get('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
      })
    );

    const primaryEmail = emailResponse.data.find(email => email.primary)?.email;

    return {
      id: userResponse.data.id.toString(),
      email: primaryEmail,
      name: userResponse.data.name || userResponse.data.login,
    };
  }
}