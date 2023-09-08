import { Queue } from 'bullmq';
import { JobRepository, JobStatusEnum } from '@novu/dal';
import { JobTopicNameEnum, StepTypeEnum } from '@novu/shared';

import { TestingQueueService } from './testing-queue.service';

const LOG_CONTEXT = 'TestingJobsService';

export class JobsService {
  private jobRepository = new JobRepository();

  public standardQueue: Queue;
  public workflowQueue: Queue;

  constructor(private isClusterMode?: boolean) {
    this.workflowQueue = new TestingQueueService(JobTopicNameEnum.WORKFLOW).queue;
    this.standardQueue = new TestingQueueService(JobTopicNameEnum.STANDARD).queue;
  }

  public async awaitParsingEvents() {
    let waitingCount = 0;
    let parsedEvents = 0;
    do {
      waitingCount = await this.workflowQueue.getWaitingCount();
      parsedEvents = await this.workflowQueue.getActiveCount();
    } while (parsedEvents > 0 || waitingCount > 0);
  }

  public async awaitRunningJobs({
    templateId,
    organizationId,
    delay,
    unfinishedJobs = 0,
  }: {
    templateId?: string | string[];
    organizationId: string;
    delay?: boolean;
    unfinishedJobs?: number;
  }) {
    let runningJobs = 0;
    let waitingCount = 0;
    let parsedEvents = 0;

    let waitingCountJobs = 0;
    let activeCountJobs = 0;

    do {
      waitingCount = await this.workflowQueue.getWaitingCount();
      parsedEvents = await this.workflowQueue.getActiveCount();

      waitingCountJobs = await this.standardQueue.getWaitingCount();
      activeCountJobs = await this.standardQueue.getActiveCount();

      runningJobs = await this.jobRepository.count({
        _organizationId: organizationId,
        type: {
          $nin: [delay ? StepTypeEnum.DELAY : StepTypeEnum.DIGEST],
        },
        _templateId: Array.isArray(templateId) ? { $in: templateId } : templateId,
        status: {
          $in: [JobStatusEnum.PENDING, JobStatusEnum.QUEUED, JobStatusEnum.RUNNING],
        },
      });
    } while (
      waitingCountJobs > 0 ||
      activeCountJobs > 0 ||
      parsedEvents > 0 ||
      waitingCount > 0 ||
      runningJobs > unfinishedJobs
    );
  }
}
