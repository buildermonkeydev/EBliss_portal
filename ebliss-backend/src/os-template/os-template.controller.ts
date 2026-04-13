import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  StreamableFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OsTemplateService } from './os-template.service';
import {
  CreateTemplateDto,
  UploadTemplateDto,
  DownloadTemplateDto,
  CloneTemplateDto,
  UpdateTemplateMetadataDto,
} from './dto/os-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Response } from 'express';

@Controller('os-templates')
@UseGuards(JwtAuthGuard)
export class OsTemplateController {
  constructor(private readonly templateService: OsTemplateService) {}

  /**
   * Get all OS templates
   */
  @Get()
  async getAllTemplates(@Query('category') category?: string) {
    let templates;
    
    if (category && (category === 'linux' || category === 'windows')) {
      templates = await this.templateService.getTemplatesByCategory(category as any);
    } else {
      templates = await this.templateService.getAllTemplates();
    }
    
    return {
      success: true,
      templates,
      total: templates.length,
    };
  }

  /**
   * Get a specific template
   */
  @Get(':volumeId')
  async getTemplate(@Param('volumeId') volumeId: string) {
    const template = await this.templateService.getTemplate(volumeId);
    return {
      success: true,
      template,
    };
  }

  /**
   * Upload a template file
   */
  @Post('upload')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadTemplate(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadTemplateDto,
  ) {
    const template = await this.templateService.uploadTemplate(file, dto);
    return {
      success: true,
      template,
      message: 'Template uploaded successfully',
    };
  }

  /**
   * Download template from URL
   */
  @Post('download')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async downloadTemplate(@Body() dto: DownloadTemplateDto) {
    const template = await this.templateService.downloadTemplate(dto);
    return {
      success: true,
      template,
      message: 'Template download started',
    };
  }

  /**
   * Update template metadata
   */
  @Put(':volumeId')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async updateTemplateMetadata(
    @Param('volumeId') volumeId: string,
    @Body() dto: UpdateTemplateMetadataDto,
  ) {
    const template = await this.templateService.updateTemplateMetadata(volumeId, dto);
    return {
      success: true,
      template,
      message: 'Template metadata updated successfully',
    };
  }

  /**
   * Delete a template
   */
  @Delete(':volumeId')
@Roles('ADMIN')
@UseGuards(RolesGuard)
@HttpCode(HttpStatus.OK)
async deleteTemplate(@Param('volumeId') volumeId: string) {
  return await this.templateService.deleteTemplate(volumeId);
}

  /**
   * Clone template to VM
   */
  @Post(':volumeId/clone')
  async cloneToVM(
    @Param('volumeId') volumeId: string,
    @Body() dto: CloneTemplateDto,
  ) {
    const result = await this.templateService.cloneToVM(volumeId, dto);
    return {
      success: true,
      ...result,
    };
  }

  /**
   * Copy template between storages
   */
  @Post(':volumeId/copy')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async copyTemplate(
    @Param('volumeId') volumeId: string,
    @Body('targetStorage') targetStorage: string,
    @Body('targetNode') targetNode?: string,
  ) {
    const template = await this.templateService.copyTemplate(volumeId, targetStorage, targetNode);
    return {
      success: true,
      template,
      message: 'Template copied successfully',
    };
  }

  /**
   * Get template statistics
   */
  @Get('stats/summary')
  async getStats() {
    const stats = await this.templateService.getTemplateStats();
    return {
      success: true,
      stats,
    };
  }

  /**
   * Get recommended templates
   */
  @Get('recommended')
  async getRecommendedTemplates() {
    const templates = await this.templateService.getAllTemplates();
    const recommended = templates.filter(t => t.recommended);
    return {
      success: true,
      templates: recommended,
      total: recommended.length,
    };
  }
}