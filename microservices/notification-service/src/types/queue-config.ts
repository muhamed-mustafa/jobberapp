import { IEmailMessageDetails } from '@muhamed-mustafa/jobber-shared';

export interface QueueConfig {
  exchange: string;
  routingKey: string;
  queue: string;
  loggerLabel: string;
  message: IEmailMessageDetails;
  handle: any;
}
