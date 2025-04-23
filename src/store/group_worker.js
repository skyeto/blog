import TokenWorker from "./token_worker.js?worker";

self.onmessage = (event) => {
  self.postMessage({
    status: "started",
  });
  const data = event.data;

  const workers = new Array(Math.min(data.solverInputs.length, 4));
  console.debug(`Using ${workers.length} workers for PoW`);
  let currentIndex = 0;
  let resultCount = 0;
  let groupWorker = self;

  for (let i = 0; i < workers.length; i++) {
    workers[i] = new TokenWorker();
    workers[i].onmessage = (event) => {
      if (event.data.type == "result") {
        data.solutionBuffer.set(
          event.data.solution,
          8 * event.data.puzzleIndex
        );
      }

      groupWorker.postMessage({
        status: "progress",
        results: {
          done: resultCount,
          working: currentIndex - resultCount,
          total: data.solverInputs.length,
        },
      });

      if (event.data.type == "result") {
        resultCount += 1;
        if (resultCount == data.solverInputs.length) {
          self.postMessage({
            status: "done",
            results: data.solutionBuffer,
          });
        } else {
          if (currentIndex < data.solverInputs.length) {
            workers[i].postMessage({
              input: data.solverInputs[currentIndex],
              puzzleIndex: currentIndex,
              threshold: data.threshold,
            });
            currentIndex += 1;
          }
        }
      }
    };
  }

  for (let i = 0; i < workers.length; i++) {
    workers[i].postMessage({
      input: data.solverInputs[i],
      puzzleIndex: i,
      workerIndex: i,
      threshold: data.threshold,
    });
    currentIndex += 1;
  }
};
