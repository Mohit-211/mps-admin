# Table architecture

The admin panel uses TanStack Table as a headless table engine.

Rules:

1. TanStack owns table state and table mechanics.
2. Our JSX/Tailwind owns visual presentation.
3. Page-specific column definitions stay with the page.
4. Shared table behavior belongs in `components/table`.
5. Data belongs in `src/data` until real APIs are introduced.
6. Filters/search can be page-specific until patterns stabilize.
7. Do not introduce MUI DataGrid, Ant Design Table, Bootstrap tables, or another visual table framework.

`DataTable.tsx` is intentionally generic and lightweight. It will grow only when a real repeated requirement appears.
