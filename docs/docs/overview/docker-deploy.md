# Deploy using Docker

Docker compose is the easiest way to get started with self-hosted Novu.

## Before you begin

You need the following installed in your system:

- [Docker](https://docs.docker.com/engine/install/) and [docker-compose](https://docs.docker.com/compose/install/)
- [Git](https://git-scm.com/downloads)

## Quick Start

### Get the code

Clone the Novu repo and enter the docker directory locally:

```bash
# Get the code
git clone --depth 1 https://github.com/novuhq/novu

# Go to the docker folder
cd novu/docker

# Copy the example env file
cp .env.example ./local/deployment/.env

# Start Novu
docker-compose -f ./local/deployment/docker-compose.yml up
```

Now visit [http://localhost:4200](http://localhost:4200/) to start using Novu.

## Securing your setup

While we provide you with some example secrets for getting started, you should NEVER deploy your Novu setup using the defaults provided.

### Update Secrets

Update the `.env` file with your own secrets. In particular, these are required:

- `JWT_SECRET`: used by the API to generate JWT keys

## Configuration

To keep the setup simple, we made some choices that may not be optimal for production:

- the database is in the same machine as the servers
- the storage uses localstack instead of S3

We strongly recommend that you decouple your database before deploying.

### Triggering events with custom installation

When self-hosting Novu, in order to trigger an event you must first create a new `Novu` object and configure it with the proper `backendUrl`.

```typescript
import { Novu } from '@novu/node';

const config = {
  backendUrl: '<REPLACE_WITH_BACKEND_URL>',
};

const novu = new Novu('<API_KEY>', config);

await novu.trigger('<REPLACE_WITH_EVENT_NAME_FROM_ADMIN_PANEL>', {
  to: {
    subscriberId: '<REPLACE_WITH_DATA>',
  },
  payload: {},
});
```

### Pointing IFrame embed to custom installation

When using the IFrame embed to attach the notification center rather than the React component, you need to specify the `backendUrl` and the `socketUrl` when initializing the iframe.

```html
<script>
  novu.init(
    '<REPLACE_APPLICATION_ID>',
    {
      unseenBadgeSelector: '#unseen-badge',
      bellSelector: '#notification-bell',
      backendUrl: 'https://api.example.com',
      socketUrl: 'https://ws.example.com',
    },
    {}
  );
</script>
```

### Using React Component with custom installation

See [Use your own backend and socket URL](https://docs.novu.co/notification-center/react/react-components#use-your-own-backend-and-socket-url).

### Caching

We are introducing the first stage of caching in our system to improve performance and efficiency. Caching is turned off by default, but can easily be activated by setting the following environment variables:

- REDIS_CACHE_SERVICE_HOST
- REDIS_CACHE_SERVICE_PORT

Currently, we are caching data in the most heavily loaded areas of the system:
the widget requests such as feed and unseen count, as well as common DAL requests during the execution of trigger event flow.
These are the most heavily used areas of our system, and we hope that by implementing caching in these areas,
we can improve performance in the near future.

## Next steps

- Got a question? [Ask here](https://discord.gg/novu).
