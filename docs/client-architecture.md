# Client-Side Architecture

This document describes the loading flow of the client-side JavaScript modules in `index.html`.

## Loading Flow

1.  **`/components/empty-state.js`**

    - **Purpose:** This module defines the `empty-state` custom element, which is displayed when there are no videos to show. It has two states: one when the user has added channels (displays "All caught up!") and another when the user hasn't added any channels (displays "Nothing to show...").
    - **Implementation:** The module defines a class `EmptyState` that extends `HTMLElement`. It uses the `connectedCallback` to add CSS classes and call the `render` method. The `render` method updates the `innerHTML` based on the `data-has-channels` attribute.

2.  **`/components/search-videos.js`**

    - **Purpose:** This module defines the `search-videos` custom element, which provides a search input for filtering videos. It also allows pasting a video URL to download the video.
    - **Implementation:** The module defines a class `SearchVideos` that extends `HTMLElement`. It renders a search input and a checkbox to include excluded videos in the search. The `searchHandler` function is called when the input changes. If the input is a URL, it calls the `/api/download-video` endpoint. Otherwise, it calls the `/api/videos` endpoint to filter videos based on the search term.

3.  **`/components/channels-list.js`**

    - **Purpose:** This module defines the `channels-list` custom element, which displays a list of subscribed YouTube channels.
    - **Implementation:** The module defines a class `ChannelsList` that extends `HTMLElement`. It uses the `data-list` attribute to receive the list of channels as a JSON string. The `render` method generates the HTML for the list of channels. Clicking on a channel filters the videos by that channel.

4.  **`/components/video-element.js`**

    - **Purpose:** This module defines the `video-element` custom element, which represents a video in the list. It displays the video thumbnail, title, channel name, and actions like download, summarize, ignore, and open externally.
    - **Implementation:** The module defines a class `VideoElement` that extends `HTMLElement`. It uses the `data-data` attribute to receive the video data as a JSON string. The `render` method generates the HTML for the video element, including different actions based on the video's state (downloaded, summarized, etc.). It also handles events for downloading, deleting, summarizing, and ignoring videos.

5.  **`/components/add-channel-form.js`**

    - **Purpose:** This module defines the `add-channel-form` custom element, which provides a form for adding new YouTube channels to track.
    - **Implementation:** The module defines a class `AddChannelForm` that extends `HTMLElement`. It renders a form with an input field for the channel name and a submit button. The `addChannelHandler` function is called when the form is submitted. It sends a POST request to the `/api/channels` endpoint to add the channel.

6.  **`/components/manage-channels-form.js`**

    - **Purpose:** This module defines the `manage-channels-form` custom element, which provides a form for managing (removing) existing YouTube channels.
    - **Implementation:** The module defines a class `ManageChannelsForm` that extends `HTMLElement`. It fetches the list of channels from the `/api/channels` endpoint and renders them as a list of clickable elements. Clicking on a channel triggers a DELETE request to the `/api/channels` endpoint to remove the channel.

7.  **`/components/video-quality-form.js`**

    - **Purpose:** This module defines the `video-quality-form` custom element, which provides a form for setting the preferred video quality.
    - **Implementation:** The module defines a class `VideoQualityForm` that extends `HTMLElement`. It renders a select element with different video quality options. It fetches the current video quality from the `/api/video-quality` endpoint and sets the selected option accordingly. When the user changes the selected option, it sends a POST request to the `/api/video-quality` endpoint to update the video quality.

8.  **`/components/manage-disk-space-form.js`**

    - **Purpose:** This module defines the `manage-disk-space-form` custom element, which provides a form for managing disk space by deleting downloaded videos.
    - **Implementation:** The module defines a class `ManageDiskSpaceForm` that extends `HTMLElement`. It renders a form with a checkbox to delete only ignored videos and a button to reclaim disk space. It fetches the current disk usage from the `/api/disk-usage` endpoint and displays it. Clicking the "Delete videos" button triggers a POST request to the `/api/reclaim-disk-space` endpoint to delete the videos.

9.  **`/components/transcode-videos-form.js`**

    - **Purpose:** This module defines the `transcode-videos-form` custom element, which provides a form for enabling or disabling video transcoding.
    - **Implementation:** The module defines a class `TranscodeVideosForm` that extends `HTMLElement`. It renders a checkbox to enable or disable transcoding. It fetches the current transcoding setting from the `/api/transcode-videos` endpoint and sets the checkbox accordingly. When the user changes the checkbox, it sends a POST request to the `/api/transcode-videos` endpoint to update the setting.

10. **`/components/excluded-terms-form.js`**

    - **Purpose:** This module defines the `excluded-terms-form` custom element, which provides a form for managing excluded search terms.
    - **Implementation:** The module defines a class `ExcludedTermsForm` that extends `HTMLElement`. It renders a form with an input field for adding new excluded terms. It fetches the current list of excluded terms from the `/api/excluded-terms` endpoint and displays them as a list. Pressing Enter in the input field triggers a POST request to the `/api/excluded-terms` endpoint to add the term. Clicking on an existing term triggers a DELETE request to the `/api/excluded-terms` endpoint to remove the term.

11. **`/main.js`**

    - **Purpose:** This module is the main entry point for the client-side application. It initializes the application state, sets up the event source for server-sent events (SSE), and handles various SSE messages to update the UI.
    - **Implementation:** The module initializes a `Store` instance and sets up a global `state` object. It creates an `EventSource` to receive SSE messages from the server. It then defines a message handler that processes different types of SSE messages, such as `state`, `download-log-line`, `new-videos`, `summary-error`, `summary`, `downloaded`, and `ignored`. These messages are used to update the UI with the latest information about video downloads, summaries, and other events. It also sets up event listeners for the summary dialog.

12. **`/lib/router.js`**

    - **Purpose:** This module handles client-side routing and navigation.
    - **Implementation:** The module defines a `routes` object that maps URL paths to their corresponding templates and initialization functions. The `handleRoute` function is called when the URL changes. It replaces the content of the `<main>` element with the template associated with the current route and calls the route's initialization function. The initialization functions are responsible for fetching data, setting up event listeners, and updating the UI. The module also sets up event listeners for links with `href="/"` and `href="/settings"` to handle navigation without full page reloads.
