import {
  ActiveJobsMetricQueueService,
  ActiveJobsMetricWorkerService,
  MetricsService,
  QueueBaseService,
  WorkerOptions,
} from '@novu/application-generic';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { checkingForCronJob } from '../../shared/utils';

const LOG_CONTEXT = 'ActiveJobMetricService';
const METRIC_JOB_ID = 'metric-job';

@Injectable()
export class ActiveJobsMetricService {
  constructor(
    @Inject('BULLMQ_LIST') private tokenList: QueueBaseService[],
    public readonly activeJobsMetricQueueService: ActiveJobsMetricQueueService,
    public readonly activeJobsMetricWorkerService: ActiveJobsMetricWorkerService,
    private metricsService: MetricsService
  ) {
    if (process.env.NOVU_MANAGED_SERVICE === 'true' && process.env.NEW_RELIC_LICENSE_KEY) {
      this.activeJobsMetricWorkerService.createWorker(this.getWorkerProcessor(), this.getWorkerOptions());

      this.activeJobsMetricWorkerService.worker.on('completed', async (job) => {
        await checkingForCronJob(process.env.ACTIVE_CRON_ID);
        Logger.verbose({ jobId: job.id }, 'Metric Completed Job', LOG_CONTEXT);
      });

      this.activeJobsMetricWorkerService.worker.on('failed', async (job, error) => {
        Logger.verbose('Metric Completed Job failed', LOG_CONTEXT, error);
      });

      this.addToQueueIfMetricJobExists();
    }
  }

  private addToQueueIfMetricJobExists(): void {
    Promise.resolve(
      this.activeJobsMetricQueueService.queue.getRepeatableJobs().then((job): boolean => {
        let exists = false;
        for (const jobElement of job) {
          if (jobElement.id === METRIC_JOB_ID) {
            exists = true;
          }
        }

        return exists;
      })
    )
      .then(async (exists: boolean): Promise<void> => {
        Logger.debug(`metric job exists: ${exists}`, LOG_CONTEXT);

        if (!exists) {
          Logger.debug(`metricJob doesn't exist, creating it`, LOG_CONTEXT);

          return await this.activeJobsMetricQueueService.add(METRIC_JOB_ID, undefined, '', {
            jobId: METRIC_JOB_ID,
            repeatJobKey: METRIC_JOB_ID,
            repeat: {
              immediately: true,
              pattern: '* * * * * *',
            },
            removeOnFail: true,
            removeOnComplete: true,
            attempts: 1,
          });
        }

        return undefined;
      })
      .catch((error) => Logger.error('Metric Job Exists function errored', LOG_CONTEXT, error));
  }

  private getWorkerOptions(): WorkerOptions {
    return {
      lockDuration: 900,
      concurrency: 1,
      settings: {},
    };
  }

  private getWorkerProcessor() {
    return async () => {
      return await new Promise<void>(async (resolve, reject): Promise<void> => {
        Logger.verbose('metric job started', LOG_CONTEXT);
        const deploymentName = process.env.FLEET_NAME ?? 'default';

        try {
          for (const queueService of this.tokenList) {
            const waitCount = (queueService.instance.queue as any).getGroupsJobsCount
              ? await (queueService.instance.queue as any).getGroupsJobsCount()
              : await queueService.instance.queue.getWaitingCount();
            const delayedCount = await queueService.instance.queue.getDelayedCount();
            const activeCount = await queueService.instance.queue.getActiveCount();

            Logger.verbose('Recording active, waiting, and delayed metrics');

            this.metricsService.recordMetric(`Queue/${deploymentName}/${queueService.topic}/waiting`, waitCount);
            this.metricsService.recordMetric(`Queue/${deploymentName}/${queueService.topic}/delayed`, delayedCount);
            this.metricsService.recordMetric(`Queue/${deploymentName}/${queueService.topic}/active`, activeCount);
          }

          return resolve();
        } catch (error) {
          Logger.error({ error }, 'Error occurred while processing metrics', LOG_CONTEXT);

          return reject(error);
        }
      });
    };
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log('Shutting the Active Jobs Metric service down', LOG_CONTEXT);

    if (this.activeJobsMetricQueueService) {
      await this.activeJobsMetricQueueService.gracefulShutdown();
    }
    if (this.activeJobsMetricWorkerService) {
      await this.activeJobsMetricWorkerService.gracefulShutdown();
    }

    Logger.log('Shutting down the Active Jobs Metric service has finished', LOG_CONTEXT);
  }
}
