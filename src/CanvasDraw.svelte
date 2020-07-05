<script>
  import { onMount, afterUpdate, onDestroy  } from "svelte";
  import { LazyBrush } from "lazy-brush";
  import { Catenary } from "catenary-curve";

  import ResizeObserver from "resize-observer-polyfill";

  export let onChange = null;
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

  $: {

    // Set new lazyRadius values
      chainLength = lazyRadius * window.devicePixelRatio;
      lazy.setRadius(lazyRadius * window.devicePixelRatio);
      loadSaveData(saveData);
      // Signal loop function that values changed
      valuesChanged = true;

  }


   onMount(() => {
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


  onDestroy(() => {
    canvasObserver.unobserve(canvasContainer)
  });



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


</script>
