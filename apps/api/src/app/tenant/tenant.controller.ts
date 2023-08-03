import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiExcludeController,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { IJwtPayload } from '@novu/shared';

import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateTenant } from './usecases/create-tenant/create-tenant.usecase';
import { CreateTenantCommand } from './usecases/create-tenant/create-tenant.command';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ApiResponse } from '../shared/framework/response.decorator';
import { GetTenant } from './usecases/get-tenant/get-tenant.usecase';
import { GetTenantCommand } from './usecases/get-tenant/get-tenant.command';
import { UpdateTenant } from './usecases/update-tenant/update-tenant.usecase';
import { DeleteTenantCommand } from './usecases/delete-tenant/delete-tenant.command';
import { DeleteTenant } from './usecases/delete-tenant/delete-tenant.usecase';
import { UpdateTenantCommand } from './usecases/update-tenant/update-tenant.command';
import { ApiOkPaginatedResponse } from '../shared/framework/paginated-ok-response.decorator';
import { PaginatedResponseDto } from '../shared/dtos/pagination-response';
import { GetTenants } from './usecases/get-tenants/get-tenants.usecase';
import { GetTenantsCommand } from './usecases/get-tenants/get-tenants.command';
import {
  UpdateTenantResponseDto,
  GetTenantResponseDto,
  GetTenantsRequestDto,
  UpdateTenantRequestDto,
  CreateTenantResponseDto,
  CreateTenantRequestDto,
} from './dtos';

@Controller('/tenants')
@ApiTags('Tenants')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiExcludeController()
export class TenantController {
  constructor(
    private createTenantUsecase: CreateTenant,
    private updateTenantUsecase: UpdateTenant,
    private getTenantUsecase: GetTenant,
    private deleteTenantUsecase: DeleteTenant,
    private getTenantsUsecase: GetTenants
  ) {}

  @Get('')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @ApiOkPaginatedResponse(GetTenantResponseDto)
  @ApiOperation({
    summary: 'Get tenants',
    description: 'Returns a list of tenants, could paginated using the `page` and `limit` query parameter',
  })
  async getTenants(
    @UserSession() user: IJwtPayload,
    @Query() query: GetTenantsRequestDto
  ): Promise<PaginatedResponseDto<GetTenantResponseDto>> {
    return await this.getTenantsUsecase.execute(
      GetTenantsCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        page: query.page ? Number(query.page) : 0,
        limit: query.limit ? Number(query.limit) : 10,
      })
    );
  }

  @Get('/:identifier')
  @ApiResponse(GetTenantResponseDto)
  @ApiOperation({
    summary: 'Get tenant',
    description: `Get tenant by your internal id used to identify the tenant`,
  })
  @ApiNotFoundResponse({
    description: 'The tenant with the identifier provided does not exist in the database.',
  })
  @ExternalApiAccessible()
  async getTenantById(
    @UserSession() user: IJwtPayload,
    @Param('identifier') identifier: string
  ): Promise<GetTenantResponseDto> {
    return await this.getTenantUsecase.execute(
      GetTenantCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: identifier,
      })
    );
  }

  @Post('/')
  @ExternalApiAccessible()
  @ApiResponse(CreateTenantResponseDto)
  @ApiOperation({
    summary: 'Create tenant',
    description: 'Create tenant under the current environment',
  })
  @ApiConflictResponse({
    description: 'A tenant with the same identifier is already exist.',
  })
  async createTenant(
    @UserSession() user: IJwtPayload,
    @Body() body: CreateTenantRequestDto
  ): Promise<CreateTenantResponseDto> {
    return await this.createTenantUsecase.execute(
      CreateTenantCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: body.identifier,
        name: body.name,
        data: body.data,
      })
    );
  }

  @Patch('/:identifier')
  @ExternalApiAccessible()
  @ApiResponse(UpdateTenantResponseDto)
  @ApiOperation({
    summary: 'Update tenant',
    description: 'Update tenant by your internal id used to identify the tenant',
  })
  @ApiNotFoundResponse({
    description: 'The tenant with the identifier provided does not exist in the database.',
  })
  async updateTenant(
    @UserSession() user: IJwtPayload,
    @Param('identifier') identifier: string,
    @Body() body: UpdateTenantRequestDto
  ): Promise<UpdateTenantResponseDto> {
    return await this.updateTenantUsecase.execute(
      UpdateTenantCommand.create({
        userId: user._id,
        identifier: identifier,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        name: body.name,
        data: body.data,
        newIdentifier: body.identifier,
      })
    );
  }

  @Delete('/:identifier')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Delete tenant',
    description: 'Deletes a tenant entity from the Novu platform',
  })
  @ApiNoContentResponse({
    description: 'The tenant has been deleted correctly',
  })
  @ApiNotFoundResponse({
    description: 'The tenant with the identifier provided does not exist in the database so it can not be deleted.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTenant(@UserSession() user: IJwtPayload, @Param('identifier') identifier: string): Promise<void> {
    return await this.deleteTenantUsecase.execute(
      DeleteTenantCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: identifier,
      })
    );
  }
}
