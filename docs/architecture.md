# my-yt Application Architecture

```mermaid
classDiagram
    direction LR

    %% Client Components
    class Client {
        +index.html
        +main.css
        +main.js
        Components
        StateManagement
        Routing
        Utilities
    }

    class Components {
        +add-channel-form
        +channels-list
        +empty-state
        +manage-channels-form
        +manage-disk-space-form
        +search-videos
        +video-element
        +video-quality-form
    }

    class StateManagement {
        +store.js
    }

    class Routing {
        +router.js
    }

    class Utilities {
        +utils.js
    }

    %% Server Components
    class Server {
        +server.js
        API
        DataFetching
        Storage
        RealTime
        BackgroundTasks
        Subtitles
    }

    class API {
        REST endpoints
    }

    class DataFetching {
        +youtube.js
        +yt-dlp.js
    }

    class Storage {
        +repository.js
    }

    class RealTime {
        +sse.js
    }

    class BackgroundTasks {
        +update-videos.js
    }

    class Subtitles {
        +subtitles-summary.js
        +llm.js
    }

    Client --> Server : HTTP/SSE
    Components --> StateManagement
    StateManagement --> Storage
```

## Component Relationships

- Client communicates with Server via HTTP/SSE protocols
- UI Components utilize centralized state management
- Server handles data fetching, storage, real-time updates, and background processing
- Subtitles processing leverages LLM integration for summarization
