// Classes that overlap share their row side by side, as in the system
// calendar (and the iOS app, LEntKit's EventColumns): a cluster is a chain
// of overlapping classes, each takes the first column free at its start,
// and every class of a cluster gets the cluster's column count. Times are
// half-open (one ending at 10:00 doesn't overlap one starting at 10:00).
// Pure, see tests/eventColumns.test.js.
export function placeEventColumns(events) {
  const sorted = [...events].sort((left, right) => (
    left.start - right.start || (right.end - right.start) - (left.end - left.start)
  ))
  const placed = new Map()
  let cluster = []
  let columnEnds = []
  let clusterEnd = -Infinity

  const closeCluster = () => {
    for (const event of cluster) placed.get(event).count = columnEnds.length
    cluster = []
    columnEnds = []
  }

  for (const event of sorted) {
    if (event.start >= clusterEnd) {
      closeCluster()
      clusterEnd = -Infinity
    }

    let column = columnEnds.findIndex((end) => end <= event.start)
    if (column === -1) {
      column = columnEnds.length
      columnEnds.push(event.end)
    } else {
      columnEnds[column] = event.end
    }

    placed.set(event, { column, count: 1 })
    cluster.push(event)
    clusterEnd = Math.max(clusterEnd, event.end)
  }

  closeCluster()
  return placed
}
