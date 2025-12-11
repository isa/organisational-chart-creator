# Org Chart Builder

![App Screenshot](./shot.png)

## About the Project

I was tired of using not-to-the-purpose and expensive online apps that help you create org charts.. They either have limits or not to the level I needed.. So I build one.. Feel free to use it!

The Org Chart Builder is an interactive web application designed to help organizations visualize their structure, client relationships, and team dynamics. Unlike traditional static charts, this tool offers a dynamic, infinite-canvas experience where users can drag and drop people and clients, establish connections, and organize entities into logical groups.

It solves the problem of complex organizational mapping by providing an intuitive interface for managing resources, tracking billability, and defining hierarchy. Users can easily create custom layouts, group related teams (e.g., "Marketing Team of EMEA"), and visualize reporting lines with customizable connection styles. The application supports "Auto Layout" to instantly organize messy charts and features an "Auto Fit" mode to keep the view centered as the organization grows.

Beyond simple visualization, the project includes powerful productivity features such as project persistence (Save/Load via JSON), high-quality PDF export for presentations, and a responsive sidebar system for managing the pool of available resources. Whether you are mapping out a small startup or a complex matrix organization, this tool provides the flexibility and visual clarity needed for effective organizational planning.

## Installation Steps

To set up and run the project locally, follow these steps:

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd orgcharter
   ```

2. **Install dependencies**
   Ensure you have Node.js installed, then run:

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

4. **Open the application**
   The application will be available at `http://localhost:4000` (or the port shown in your terminal).

## Tech Stack

This project leverages a modern, robust technology stack to deliver a high-performance and responsive user experience:

-  **Framework**: [React](https://react.dev/) (v18) with [Vite](https://vitejs.dev/) for lightning-fast development and building.
-  **Styling**: [Tailwind CSS](https://tailwindcss.com/) for utility-first styling and responsive design.
-  **UI Components**: [Radix UI](https://www.radix-ui.com/) primitives (likely via [shadcn/ui](https://ui.shadcn.com/)) for accessible and unstyled component foundations.
-  **Icons**: [Lucide React](https://lucide.dev/) for consistent and beautiful vector icons.
-  **Canvas & Interaction**: Custom canvas implementation with infinite panning, zooming, and drag-and-drop logic.
-  **Export Utilities**:
   -  `html-to-image` for capturing canvas snapshots.
   -  `jspdf` for generating downloadable PDF reports.
-  **State Management**: React Hooks (`useState`, `useEffect`, `useRef`) with LocalStorage persistence.
