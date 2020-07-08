<script>
import CanvasDraw from "../src/CanvasDraw.svelte";
let brushColor = '#444'
</script>

<input type="color" bind:value={brushColor}>
<CanvasDraw {brushColor} />