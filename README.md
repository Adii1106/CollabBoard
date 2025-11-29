# Collaborative Whiteboard Application

A real-time collaborative whiteboard application with AI-powered tools, chat, and user management.

## Features

- **Real-time Collaboration**: Draw, erase, and move cursors in real-time with other users.
- **Tools**: Brush, Eraser, Rectangle, Circle.
- **Customization**: Change brush color and size.
- **User Management**: Authentication via Keycloak, Members List.
- **Communication**: Real-time chat with other users in the session.
- **AI Tools**: Image classification using TensorFlow.js (MobileNet).
- **Persistence**: Whiteboard state is preserved during the session.
- **Responsive Design**: Works on various screen sizes.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Konva (react-konva), Bootstrap 5, Socket.IO Client.
- **Backend**: Node.js, Express, Socket.IO, Prisma, MySQL (via Docker).
- **Authentication**: Keycloak (via Docker).
- **AI**: TensorFlow.js.

## Prerequisites

- Node.js (v18+)
- Docker and Docker Compose

## Setup Instructions

1.  **Start Infrastructure Services (MySQL & Keycloak)**

    Navigate to the project root and run:

    ```bash
    docker-compose up -d
    ```

    Wait for Keycloak and MySQL to be fully ready. Keycloak may take a minute or two.

2.  **Backend Setup**

    Navigate to the `backend` directory:

    ```bash
    cd backend
    ```

    Install dependencies:

    ```bash
    npm install
    ```

    Set up the database schema:

    ```bash
    npx prisma db push
    ```

    Start the backend server:

    ```bash
    npm run dev
    ```

    The backend will run on `http://localhost:3001`.

3.  **Frontend Setup**

    Navigate to the `frontend` directory:

    ```bash
    cd frontend
    ```

    Install dependencies:

    ```bash
    npm install
    ```

    Start the frontend development server:

    ```bash
    npm run dev
    ```

    The frontend will run on `http://localhost:5173`.

## Usage

1.  Open `http://localhost:5173` in your browser.
2.  Log in using the Keycloak credentials (default: `admin` / `admin` if configured in docker-compose, or register a new user).
3.  Click "Create New Session" to start a whiteboard session.
4.  Share the Session ID with others to collaborate.
5.  Use the toolbar at the bottom to switch tools, change colors, and undo/redo.
6.  Use the buttons at the top right to access Chat, AI Tools, and the Members List.

## License

MIT
