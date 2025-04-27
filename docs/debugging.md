# Debugging Guide

This guide provides instructions on how to set up step debugging for both the client and server-side of the application. Step debugging allows you to pause the execution of your code and step through it line by line, inspecting variables and understanding the flow of execution. This is a powerful technique for understanding the codebase and identifying issues.

## Client-Side Debugging (Browser)

These instructions will guide you through setting up client-side debugging using VS Code and Google Chrome.

1.  **Install the "JavaScript Debugger" extension in VS Code.**

    - Open VS Code.
    - Go to the Extensions view (View -> Extensions or Ctrl+Shift+X).
    - Search for "Debugger for Chrome" and install it.

2.  **Create a launch configuration for Chrome.**

    - Go to the Run and Debug view (View -> Run or Ctrl+Shift+D).
    - Click on "create a launch.json file".
    - Choose "Chrome" as the environment.
    - This will create a `.vscode/launch.json` file in your project.

3.  **Modify the `launch.json` file.**

    - Open the `.vscode/launch.json` file.
    - Modify the configuration to point to your client application's URL. For example:

    ```json
    {
      "version": "0.2.0",
      "configurations": [
        {
          "type": "chrome",
          "request": "launch",
          "name": "Launch Chrome against localhost",
          "url": "http://localhost:3000",
          "webRoot": "${workspaceFolder}/client"
        }
      ]
    }
    ```

    - **`url`**: This should be the URL where your client application is running. Adjust the port if necessary.
    - **`webRoot`**: This should point to the root directory of your client-side code.

4.  **Start your client application.**

    - Make sure your client application is running (e.g., using `npm start` or `yarn start`).

5.  **Start debugging in VS Code.**

    - Go to the Run and Debug view.
    - Select the "Launch Chrome against localhost" configuration (or whatever you named it).
    - Click the "Start Debugging" button (green play icon) or press F5.

6.  **Set breakpoints in your client-side code.**

    - Open the JavaScript file you want to debug in VS Code (e.g., `client/main.js`).
    - Click in the gutter (the space to the left of the line numbers) to set a breakpoint on the line where you want to pause execution.

7.  **Interact with your application in the browser.**
    - When you perform an action in the browser that triggers the code where you set a breakpoint, the execution will pause in VS Code.
    - You can then step through the code, inspect variables, and examine the call stack.

## Server-Side Debugging (Node.js)

These instructions will guide you through setting up server-side debugging using VS Code and Node.js.

1.  **Create a launch configuration for Node.js.**

    - Go to the Run and Debug view (View -> Run or Ctrl+Shift+D).
    - If you don't already have a `launch.json` file, click on "create a launch.json file".
    - Choose "Node.js" as the environment.
    - If you already have a `launch.json` file, add a new configuration.

2.  **Modify the `launch.json` file.**

    - Open the `.vscode/launch.json` file.
    - Add a configuration that specifies how to launch your server. For example:

    ```json
    {
      "version": "0.2.0",
      "configurations": [
        {
          "type": "node",
          "request": "launch",
          "name": "Launch Server",
          "program": "${workspaceFolder}/index.js"
        }
      ]
    }
    ```

    - **`program`**: This should be the path to your server's entry point file (e.g., `index.js`).

3.  **Start debugging in VS Code.**

    - Go to the Run and Debug view.
    - Select the "Launch Server" configuration (or whatever you named it).
    - Click the "Start Debugging" button (green play icon) or press F5.

4.  **Set breakpoints in your server-side code.**

    - Open the JavaScript file you want to debug in VS Code (e.g., `index.js`).
    - Click in the gutter to set a breakpoint on the line where you want to pause execution.

5.  **Interact with your application (e.g., through the browser or an API client).**
    - When you make a request to your server that triggers the code where you set a breakpoint, the execution will pause in VS Code.
    - You can then step through the code, inspect variables, and examine the call stack.
