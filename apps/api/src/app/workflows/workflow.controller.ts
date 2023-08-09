import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Delete,
  Param,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { IJwtPayload, MemberRoleEnum } from '@novu/shared';
import { UserSession } from '../shared/framework/user.decorator';
import { GetNotificationTemplates } from './usecases/get-notification-templates/get-notification-templates.usecase';
import { GetNotificationTemplatesCommand } from './usecases/get-notification-templates/get-notification-templates.command';
import { CreateNotificationTemplate, CreateNotificationTemplateCommand } from './usecases/create-notification-template';
import { CreateWorkflowRequestDto, UpdateWorkflowRequestDto, ChangeWorkflowStatusRequestDto } from './dto';
import { GetNotificationTemplate } from './usecases/get-notification-template/get-notification-template.usecase';
import { GetNotificationTemplateCommand } from './usecases/get-notification-template/get-notification-template.command';
import { UpdateNotificationTemplate } from './usecases/update-notification-template/update-notification-template.usecase';
import { DeleteNotificationTemplate } from './usecases/delete-notification-template/delete-notification-template.usecase';
import { UpdateNotificationTemplateCommand } from './usecases/update-notification-template/update-notification-template.command';
import { ChangeTemplateActiveStatus } from './usecases/change-template-active-status/change-template-active-status.usecase';
import { ChangeTemplateActiveStatusCommand } from './usecases/change-template-active-status/change-template-active-status.command';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { RootEnvironmentGuard } from '../auth/framework/root-environment-guard.service';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkflowResponse } from './dto/workflow-response.dto';
import { WorkflowsResponseDto } from './dto/workflows.response.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { WorkflowsRequestDto } from './dto/workflows-request.dto';
import { Roles } from '../auth/framework/roles.decorator';
import { ApiResponse } from '../shared/framework/response.decorator';
import { DataBooleanDto } from '../shared/dtos/data-wrapper-dto';
import { CreateWorkflowQuery } from './queries';

@Controller('/workflows')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiTags('Workflows')
export class WorkflowController {
  constructor(
    private getWorkflowsUsecase: GetNotificationTemplates,
    private createWorkflowUsecase: CreateNotificationTemplate,
    private getWorkflowUsecase: GetNotificationTemplate,
    private updateWorkflowByIdUsecase: UpdateNotificationTemplate,
    private deleteWorkflowByIdUsecase: DeleteNotificationTemplate,
    private changeWorkflowActiveStatusUsecase: ChangeTemplateActiveStatus
  ) {}

  @Get('')
  @ApiResponse(WorkflowResponse)
  @ApiOperation({
    summary: 'Get workflows',
    description: `Workflows were previously named notification templates`,
  })
  @ExternalApiAccessible()
  getWorkflows(@UserSession() user: IJwtPayload, @Query() query: WorkflowsRequestDto): Promise<WorkflowsResponseDto> {
    return this.getWorkflowsUsecase.execute(
      GetNotificationTemplatesCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        page: query.page ? query.page : 0,
        limit: query.limit ? query.limit : 10,
      })
    );
  }

  @Put('/:workflowId')
  @ApiResponse(WorkflowResponse)
  @ApiOperation({
    summary: 'Update workflow',
    description: `Workflow was previously named notification template`,
  })
  @ExternalApiAccessible()
  async updateWorkflowById(
    @UserSession() user: IJwtPayload,
    @Param('workflowId') workflowId: string,
    @Body() body: UpdateWorkflowRequestDto
  ): Promise<WorkflowResponse> {
    return await this.updateWorkflowByIdUsecase.execute(
      UpdateNotificationTemplateCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        id: workflowId,
        name: body.name,
        tags: body.tags,
        description: body.description,
        identifier: body.identifier,
        critical: body.critical,
        preferenceSettings: body.preferenceSettings,
        steps: body.steps,
        notificationGroupId: body.notificationGroupId,
        data: body.data,
      })
    );
  }

  @Delete('/:workflowId')
  @UseGuards(RootEnvironmentGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @ApiOkResponse({
    type: DataBooleanDto,
  })
  @ApiOperation({
    summary: 'Delete workflow',
    description: `Workflow was previously named notification template`,
  })
  @ExternalApiAccessible()
  deleteWorkflowById(@UserSession() user: IJwtPayload, @Param('workflowId') workflowId: string): Promise<boolean> {
    return this.deleteWorkflowByIdUsecase.execute(
      GetNotificationTemplateCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        templateId: workflowId,
      })
    );
  }

  @Get('/:workflowId')
  @ApiResponse(WorkflowResponse)
  @ApiOperation({
    summary: 'Get workflow',
    description: `Workflow was previously named notification template`,
  })
  @ExternalApiAccessible()
  getWorkflowById(
    @UserSession() user: IJwtPayload,
    @Param('workflowId') workflowId: string
  ): Promise<WorkflowResponse> {
    return this.getWorkflowUsecase.execute(
      GetNotificationTemplateCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        templateId: workflowId,
      })
    );
  }

  @Post('')
  @ExternalApiAccessible()
  @UseGuards(RootEnvironmentGuard)
  @ApiResponse(WorkflowResponse, 201)
  @ApiOperation({
    summary: 'Create workflow',
    description: `Workflow was previously named notification template`,
  })
  @Roles(MemberRoleEnum.ADMIN)
  createWorkflows(
    @UserSession() user: IJwtPayload,
    @Query() query: CreateWorkflowQuery,
    @Body() body: CreateWorkflowRequestDto
  ): Promise<WorkflowResponse> {
    return this.createWorkflowUsecase.execute(
      CreateNotificationTemplateCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        name: body.name,
        tags: body.tags,
        description: body.description,
        steps: body.steps,
        notificationGroupId: body.notificationGroupId,
        active: body.active ?? false,
        draft: !body.active,
        critical: body.critical ?? false,
        preferenceSettings: body.preferenceSettings,
        blueprintId: body.blueprintId,
        data: body.data,
        __source: query?.__source,
      })
    );
  }

  @Put('/:workflowId/status')
  @UseGuards(RootEnvironmentGuard)
  @Roles(MemberRoleEnum.ADMIN)
  @ApiResponse(WorkflowResponse)
  @ApiOperation({
    summary: 'Update workflow status',
    description: `Workflow was previously named notification template`,
  })
  @ExternalApiAccessible()
  changeActiveStatus(
    @UserSession() user: IJwtPayload,
    @Body() body: ChangeWorkflowStatusRequestDto,
    @Param('workflowId') workflowId: string
  ): Promise<WorkflowResponse> {
    return this.changeWorkflowActiveStatusUsecase.execute(
      ChangeTemplateActiveStatusCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        active: body.active,
        templateId: workflowId,
      })
    );
  }
}
