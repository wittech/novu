import {
  BullMqService,
  getInboundParseMailWorkerOptions,
  WorkerBaseService,
  WorkerOptions,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';
import { JobTopicNameEnum } from '@novu/shared';
import { Injectable, Logger } from '@nestjs/common';

import { InboundEmailParse } from '../usecases/inbound-email-parse/inbound-email-parse.usecase';
import { InboundEmailParseCommand } from '../usecases/inbound-email-parse/inbound-email-parse.command';

const LOG_CONTEXT = 'InboundParseQueueService';

@Injectable()
export class InboundParseWorkerService extends WorkerBaseService {
  constructor(
    private emailParseUsecase: InboundEmailParse,
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService
  ) {
    super(JobTopicNameEnum.INBOUND_PARSE_MAIL, new BullMqService(workflowInMemoryProviderService));

    this.createWorker(this.getWorkerProcessor(), this.getWorkerOptions());
  }

  private getWorkerOptions(): WorkerOptions {
    return getInboundParseMailWorkerOptions();
  }

  public getWorkerProcessor() {
    return async ({ data }: { data: InboundEmailParseCommand }) => {
      Logger.verbose({ data }, 'Processing the inbound parsed email', LOG_CONTEXT);
      await this.emailParseUsecase.execute(InboundEmailParseCommand.create({ ...data }));
    };
  }
}
