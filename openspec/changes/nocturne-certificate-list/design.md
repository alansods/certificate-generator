## Losing the status filter

Removing the status column and filter is a real reduction in what the list can answer: "show me every revoked certificate" stops being a question this screen can ask. The owner chose it deliberately, following the mockup, and it is recorded here rather than buried so the next person does not read it as an oversight.

Two things keep it from being a trap. The backend's `status` parameter stays supported and tested, so restoring the filter later is a frontend change alone. And nothing else in the product loses access to status: the API returns it, the PDF renders from it, and the public verification page still distinguishes issued, revoked and not-yet-issued — which is where a recipient's question about status actually gets asked.

## The row menu and one-open-at-a-time

Four icon buttons per row is a lot of pixels spent on actions that are rarely used, and on a narrow viewport they push the content columns to nothing. One menu button costs one click for the same actions and gives Delete somewhere to be visually separated from the rest.

The menu must close on outside click, on Escape, and when another row's menu opens. The last one matters more than it looks: without it, scrolling a long list can leave several panels open at once over rows the user is no longer looking at. Keeping the open row's id in a single signal makes this the default rather than something to remember.

## Skeleton instead of a spinner

The list re-fetches on every debounced search change and every page change. Replacing the table with a spinner makes that flash the whole screen; a skeleton with the same column template keeps the layout still and reads as "the same table, updating". The skeleton uses the grid's own `grid-template-columns` value so the two cannot drift apart.

## Two empty states

"No certificates yet" and "nothing matched your search" want different actions — the first wants a create button, the second wants the search cleared. They are one requirement in the spec today; splitting them is the smallest change that makes the search dead end recoverable.
