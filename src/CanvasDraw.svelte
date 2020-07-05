<script>
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
</script>
