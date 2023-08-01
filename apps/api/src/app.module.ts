import { DynamicModule, HttpException, Module, Logger, Provider } from '@nestjs/common';
import { RavenInterceptor, RavenModule } from 'nest-raven';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { ForwardReference } from '@nestjs/common/interfaces/modules/forward-reference.interface';

import { SharedModule } from './app/shared/shared.module';
import { UserModule } from './app/user/user.module';
import { AuthModule } from './app/auth/auth.module';
import { TestingModule } from './app/testing/testing.module';
import { HealthModule } from './app/health/health.module';
import { OrganizationModule } from './app/organization/organization.module';
import { EnvironmentsModule } from './app/environments/environments.module';
import { ExecutionDetailsModule } from './app/execution-details/execution-details.module';
import { WorkflowModule } from './app/workflows/workflow.module';
import { EventsModule } from './app/events/events.module';
import { WidgetsModule } from './app/widgets/widgets.module';
import { NotificationModule } from './app/notifications/notification.module';
import { StorageModule } from './app/storage/storage.module';
import { NotificationGroupsModule } from './app/notification-groups/notification-groups.module';
import { InvitesModule } from './app/invites/invites.module';
import { ContentTemplatesModule } from './app/content-templates/content-templates.module';
import { IntegrationModule } from './app/integrations/integrations.module';
import { ChangeModule } from './app/change/change.module';
import { SubscribersModule } from './app/subscribers/subscribers.module';
import { FeedsModule } from './app/feeds/feeds.module';
import { LayoutsModule } from './app/layouts/layouts.module';
import { MessagesModule } from './app/messages/messages.module';
import { PartnerIntegrationsModule } from './app/partner-integrations/partner-integrations.module';
import { TopicsModule } from './app/topics/topics.module';
import { InboundParseModule } from './app/inbound-parse/inbound-parse.module';
import { BlueprintModule } from './app/blueprint/blueprint.module';
import { TenantModule } from './app/tenant/tenant.module';

const modules: Array<Type | DynamicModule | Promise<DynamicModule> | ForwardReference> = [
  InboundParseModule,
  OrganizationModule,
  SharedModule,
  UserModule,
  AuthModule,
  HealthModule,
  EnvironmentsModule,
  ExecutionDetailsModule,
  WorkflowModule,
  EventsModule,
  WidgetsModule,
  NotificationModule,
  StorageModule,
  NotificationGroupsModule,
  InvitesModule,
  ContentTemplatesModule,
  IntegrationModule,
  ChangeModule,
  SubscribersModule,
  FeedsModule,
  LayoutsModule,
  MessagesModule,
  PartnerIntegrationsModule,
  TopicsModule,
  BlueprintModule,
  TenantModule,
];

const providers: Provider[] = [];

if (process.env.SENTRY_DSN) {
  modules.push(RavenModule);
  providers.push({
    provide: APP_INTERCEPTOR,
    useValue: new RavenInterceptor({
      filters: [
        /*
         * Filter exceptions to type HttpException. Ignore those that
         * have status code of less than 500
         */
        { type: HttpException, filter: (exception: HttpException) => exception.getStatus() < 500 },
      ],
      user: ['_id', 'firstName', 'organizationId', 'environmentId', 'roles', 'domain'],
    }),
  });
}

if (process.env.NODE_ENV === 'test') {
  modules.push(TestingModule);
}

@Module({
  imports: modules,
  controllers: [],
  providers,
})
export class AppModule {
  constructor() {
    Logger.log(`BOOTSTRAPPED NEST APPLICATION`);
  }
}
