import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { PlansService } from './plans.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  async getAllPlans(@Query('type') type?: string) {
    return this.plansService.getAllPlans(type as any);
  }

  @Get(':id')
  async getPlan(@Param('id', ParseIntPipe) id: number) {
    return this.plansService.getPlan(id);
  }

  @Get('os/templates')
  async getOSTemplates() {
    return this.plansService.getOSTemplates();
  }
}