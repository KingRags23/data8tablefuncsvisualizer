# Data 8 Table Functions Visualizer

Interactive, Python Tutor–style walkthroughs of `datascience` table methods for Data 8.

The app loads a synthetic `students` table (100 rows × 10 columns). All values are AI-generated for teaching demos and are not real student data. Students pick a method and arguments from menus — no free typing — then step through what the call does.

## Live site

https://kingrags23.github.io/data8tablefuncsvisualizer/

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

Local preview of the GitHub Pages build:

```bash
npm run build
npm run preview
```

## Methods included

`.num_rows`, `.num_columns`, `.labels`, `.show`, `.column`, `.select`, `.drop`, `.relabeled`, `.where`, `.take`, `.sort`

Reference: [data8.org/fa26/reference](https://data8.org/fa26/reference/)
