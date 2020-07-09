<script>
  import { onMount, afterUpdate, onDestroy, createEventDispatcher  } from "svelte";
  const dispatch = createEventDispatcher();
  import { LazyBrush } from "lazy-brush";
  import { Catenary } from "catenary-curve";

  import ResizeObserver from "resize-observer-polyfill";

  export let loadTimeOffset = 5;
  export let lazyRadius = 12;
  export let brushRadius = 10;
  export let brushColor = "#444";
  export let catenaryColor = "#0a0302";
  export let gridColor = "rgba(150,150,150,0.17)";
  export let backgroundColor = "#FFF";
  export let hideGrid = false;
  export let canvasWidth = 400;
  export let canvasHeight = 400;
  export let disabled = false;
  export let imgSrc = "";
  export let saveData = "";
  export let immediateLoading = false;
  export let hideInterface = false;
  export let classes = '';


  function midPointBtw(p1, p2) {
      return {
        x: p1.x + (p2.x - p1.x) / 2,
        y: p1.y + (p2.y - p1.y) / 2
      };
    }

  const canvasStyle = {
    display: "block",
    position: "absolute"
  };

  const canvasTypes = [
    {
      name: "interface",
      zIndex: 15
    },
    {
      name: "drawing",
      zIndex: 11
    },
    {
      name: "temp",
      zIndex: 12
    },
    {
      name: "grid",
      zIndex: 10
    }
  ];


   let canvas = {};
   let ctx = {};

   let catenary = new Catenary();

   let points = [];
   let lines = [];

   let mouseHasMoved = true;
   let valuesChanged = true;
   let isDrawing = false;
   let isPressing = false;
   let lazy = null;
   let image = null;
   let chainLength = null;

   let canvasContainer = null;
   let canvasObserver = null;




   onMount(() => {

    Object.keys(canvas).forEach((key) => {
      ctx[key] = canvas[key].getContext("2d");
     })

    console.log(ctx)

     lazy = new LazyBrush({
       radius: lazyRadius * window.devicePixelRatio,
      enabled: true,
      initialPoint: {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      }
    });
    chainLength = lazyRadius * window.devicePixelRatio;

    canvasObserver = new ResizeObserver((entries, observer) =>
      handleCanvasResize(entries, observer)
    );
    canvasObserver.observe(canvasContainer);

    drawImage();
    loop();

    window.setTimeout(() => {
      const initX = window.innerWidth / 2;
      const initY = window.innerHeight / 2;
      lazy.update(
        { x: initX - chainLength / 4, y: initY },
        { both: true }
      );
      lazy.update(
        { x: initX + chainLength / 4, y: initY },
        { both: false }
      );
      mouseHasMoved = true;
      valuesChanged = true;
      clear();

      // Load saveData from prop if it exists
      if (saveData) {
        loadSaveData(saveData);
      }
    }, 100);

  });


  // afterUpdate(() => {
  //   // Set new lazyRadius values
  //   chainLength = lazyRadius * window.devicePixelRatio;
  //   lazy.setRadius(lazyRadius * window.devicePixelRatio);
  //   loadSaveData(saveData);
  //   // Signal loop function that values changed
  //   valuesChanged = true;

  // });



  // onDestroy(() => {
  //   canvasObserver.unobserve(canvasContainer)
  // });



  let drawImage = () => {
    if (!imgSrc) return;
    image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => drawImage({ ctx: ctx.grid, img: image });
    image.src = imgSrc;
  };

  let undo = () => {
    const lines = lines.slice(0, -1);
    clear();
    simulateDrawingLines({ lines, immediate: true });
    triggerOnChange();
  };

  let getSaveData = () => {
    return JSON.stringify({
      lines: lines,
      width: canvasWidth,
      height: canvasHeight
    });
  };

  let loadSaveData = (saveData, immediate = immediateLoading) => {
    console.log(saveData)
    if (typeof saveData !== "string") {
      throw new Error("saveData needs to be of type string!");
    }

    const { lines, width, height } = JSON.parse(saveData);

    if (!lines || typeof lines.push !== "function") {
      throw new Error("saveData.lines needs to be an array!");
    }

    clear();

    if (width === canvasWidth && height === canvasHeight) {
      simulateDrawingLines({
        lines,
        immediate
      });
    } else {
      const scaleX = canvasWidth / width;
      const scaleY = canvasHeight / height;
      const scaleAvg = (scaleX + scaleY) / 2;

      simulateDrawingLines({
        lines: lines.map(line => ({
          ...line,
          points: line.points.map(p => ({
            x: p.x * scaleX,
            y: p.y * scaleY
          })),
          brushRadius: line.brushRadius * scaleAvg
        })),
        immediate
      });
    }
  };


  let simulateDrawingLines = ({ lines, immediate }) => {
    // Simulate live-drawing of the loaded lines
    // TODO use a generator
    let curTime = 0;
    let timeoutGap = immediate ? 0 : loadTimeOffset;

    lines.forEach(line => {
      const { points, brushColor, brushRadius } = line;

      // Draw all at once if immediate flag is set, instead of using setTimeout
      if (immediate) {
        // Draw the points
        drawPoints({
          points,
          brushColor,
          brushRadius
        });

        // Save line with the drawn points
        points = points;
        saveLine({ brushColor, brushRadius });
        return;
      }

      // Use timeout to draw
      for (let i = 1; i < points.length; i++) {
        curTime += timeoutGap;
        window.setTimeout(() => {
          drawPoints({
            points: points.slice(0, i + 1),
            brushColor,
            brushRadius
          });
        }, curTime);
      }

      curTime += timeoutGap;
      window.setTimeout(() => {
        // Save this line with its props instead of props
        points = points;
        saveLine({ brushColor, brushRadius });
      }, curTime);
    });
  };

  let handleDrawStart = e => {
    e.preventDefault();

    // Start drawing
    isPressing = true;

    const { x, y } = getPointerPos(e);

    if (e.touches && e.touches.length > 0) {
      // on touch, set catenary position to touch pos
      lazy.update({ x, y }, { both: true });
    }

    // Ensure the initial down position gets added to our line
    handlePointerMove(x, y);
  };

  let handleDrawMove = e => {
    e.preventDefault();

    const { x, y } = getPointerPos(e);
    handlePointerMove(x, y);
  };

  let handleDrawEnd = e => {
    e.preventDefault();

    // Draw to this end pos
    handleDrawMove(e);

    // Stop drawing & save the drawn line
    isDrawing = false;
    isPressing = false;
    saveLine();
  };

  let handleCanvasResize = (entries, observer) => {
    const saveData = getSaveData();
    for (const entry of entries) {
      console.log(entry)
      const { width, height } = entry.contentRect;
      setCanvasSize(canvas.interface, width, height);
      setCanvasSize(canvas.drawing, width, height);
      setCanvasSize(canvas.temp, width, height);
      setCanvasSize(canvas.grid, width, height);

      drawGrid(ctx.grid);
      drawImage();
      loop({ once: true });
    }
    loadSaveData(saveData, true);
  };

  let setCanvasSize = (canvas, width, height) => {
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = width;
    canvas.style.height = height;
  };

  let getPointerPos = e => {
    const rect = canvas.interface.getBoundingClientRect();

    // use cursor pos as default
    let clientX = e.clientX;
    let clientY = e.clientY;

    // use first touch if available
    if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }

    // return mouse/touch position inside canvas
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  let handlePointerMove = (x, y) => {
    if (disabled) return;

    lazy.update({ x, y });
    const isDisabled = !lazy.isEnabled();

    if (
      (isPressing && !isDrawing) ||
      (isDisabled && isPressing)
    ) {
      // Start drawing and add point
      isDrawing = true;
      points.push(lazy.brush.toObject());
    }

    if (isDrawing) {
      // Add new point
      points.push(lazy.brush.toObject());

      // Draw current points
      drawPoints({
        points: points,
        brushColor: brushColor,
        brushRadius: brushRadius
      });
    }

    mouseHasMoved = true;
  };

  let drawPoints = ({ points, brushColor, brushRadius }) => {
    ctx.temp.lineJoin = "round";
    ctx.temp.lineCap = "round";
    ctx.temp.strokeStyle = brushColor;

    ctx.temp.clearRect(
      0,
      0,
      ctx.temp.canvas.width,
      ctx.temp.canvas.height
    );
    ctx.temp.lineWidth = brushRadius * 2;

    let p1 = points[0];
    let p2 = points[1];

    ctx.temp.moveTo(p2.x, p2.y);
    ctx.temp.beginPath();

    for (var i = 1, len = points.length; i < len; i++) {
      // we pick the point between pi+1 & pi+2 as the
      // end point and p1 as our control point
      var midPoint = midPointBtw(p1, p2);
      ctx.temp.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
      p1 = points[i];
      p2 = points[i + 1];
    }
    // Draw last line as a straight line while
    // we wait for the next point to be able to calculate
    // the bezier control point
    ctx.temp.lineTo(p1.x, p1.y);
    ctx.temp.stroke();
  };

  let saveLine = ({ brushColor, brushRadius } = {}) => {
    if (points.length < 2) return;

    // Save as new line
    lines.push({
      points: [...points],
      brushColor: brushColor || brushColor,
      brushRadius: brushRadius || brushRadius
    });

    // Reset points array
    points.length = 0;

    const width = canvas.temp.width;
    const height = canvas.temp.height;

    // Copy the line to the drawing canvas
    ctx.drawing.drawImage(canvas.temp, 0, 0, width, height);

    // Clear the temporary line-drawing canvas
    ctx.temp.clearRect(0, 0, width, height);

    triggerOnChange();
  };

  let triggerOnChange = (event) => {
    dispatch('change', event);
  };

  let clear = () => {
    lines = [];
    valuesChanged = true;
    ctx.drawing.clearRect(
      0,
      0,
      canvas.drawing.width,
      canvas.drawing.height
    );
    ctx.temp.clearRect(
      0,
      0,
      canvas.temp.width,
      canvas.temp.height
    );
  };

  let loop = ({ once = false } = {}) => {
    if (mouseHasMoved || valuesChanged) {
      const pointer = lazy.getPointerCoordinates();
      const brush = lazy.getBrushCoordinates();

      drawInterface(ctx.interface, pointer, brush);
      mouseHasMoved = false;
      valuesChanged = false;
    }

    if (!once) {
      window.requestAnimationFrame(() => {
        loop();
      });
    }
  };

  let drawGrid = ctx => {
    if (hideGrid) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.beginPath();
    ctx.setLineDash([5, 1]);
    ctx.setLineDash([]);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;

    const gridSize = 25;

    let countX = 0;
    while (countX < ctx.canvas.width) {
      countX += gridSize;
      ctx.moveTo(countX, 0);
      ctx.lineTo(countX, ctx.canvas.height);
    }
    ctx.stroke();

    let countY = 0;
    while (countY < ctx.canvas.height) {
      countY += gridSize;
      ctx.moveTo(0, countY);
      ctx.lineTo(ctx.canvas.width, countY);
    }
    ctx.stroke();
  };

  let drawInterface = (ctx, pointer, brush) => {
    if (hideInterface) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw brush preview
    ctx.beginPath();
    ctx.fillStyle = brushColor;
    ctx.arc(brush.x, brush.y, brushRadius, 0, Math.PI * 2, true);
    ctx.fill();

    // Draw mouse point (the one directly at the cursor)
    ctx.beginPath();
    ctx.fillStyle = catenaryColor;
    ctx.arc(pointer.x, pointer.y, 4, 0, Math.PI * 2, true);
    ctx.fill();

    // Draw catenary
    if (lazy.isEnabled()) {
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = catenaryColor;
      // catenary.drawToCanvas(
      //   ctx.interface,
      //   brush,
      //   pointer,
      //   chainLength
      // );
      ctx.stroke();
    }

    // Draw brush point (the one in the middle of the brush preview)
    ctx.beginPath();
    ctx.fillStyle = catenaryColor;
    ctx.arc(brush.x, brush.y, 2, 0, Math.PI * 2, true);
    ctx.fill();
  };



</script>
<style>
  .drwaing-container{
    display: block;
    touch-action: none;
  }


</style>

  <div
    class="drwaing-container {classes}"
    style="height:{canvasHeight}px; width:{canvasWidth}px; background-color:{backgroundColor}"
    bind:this={canvasContainer}>
    {#each canvasTypes as {name, zIndex}}
      <canvas
        key={name}
        style="display:block;position:absolute; z-index:{zIndex}"
        bind:this={canvas[name]}
        on:mousedown={name === "interface" ? handleDrawStart : undefined}
        on:mousemove={name === "interface" ? handleDrawMove : undefined}
        on:mouseup={name === "interface" ? handleDrawEnd : undefined}
        on:mouseout={name === "interface" ? handleDrawEnd : undefined}
        on:touchstart={name === "interface" ? handleDrawStart : undefined}
        on:touchmove={name === "interface" ? handleDrawMove : undefined}
        on:touchend={name === "interface" ? handleDrawEnd : undefined}
        on:touchcancel={name === "interface" ? handleDrawEnd : undefined}
      />
    {/each}
  </div>
