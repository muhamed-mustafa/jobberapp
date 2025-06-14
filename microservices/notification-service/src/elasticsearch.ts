import { Client } from '@elastic/elasticsearch';
import { ClusterHealthResponse } from '@elastic/elasticsearch/lib/api/types';
import { config } from '@notifications/config';
import { winstonLogger } from '@muhamed-mustafa/jobber-shared';
import { Logger } from 'winston';

export class ElasticsearchService {
  private client: Client;
  private logger: Logger;

  constructor() {
    this.client = new Client({ node: config.ELASTIC_SEARCH_URL });
    this.logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'notification-elasticsearch-server', 'debug');
  }

  public async checkConnection(): Promise<ClusterHealthResponse | void> {
    let isConnected = false;

    while (!isConnected) {
      try {
        const health: ClusterHealthResponse = await this.client.cluster.health({});
        this.logger.info(`NotificationService Elasticsearch health status - ${health.status}`);
        isConnected = true;
        return health;
      } catch (error) {
        this.logger.error('Connection to Elasticsearch failed. Retrying...');
        this.logger.log('error', 'NotificationService checkConnection() method:', error);
      }
    }
  }
}
