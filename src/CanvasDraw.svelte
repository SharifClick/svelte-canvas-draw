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


</script>
