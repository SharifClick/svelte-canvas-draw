<script>
  import CanvasDraw from "../src/CanvasDraw.svelte";
  let brushColor = "#444";
  let brushRadius = 10;

</script>

<div class="container">
  <div class="row">
    <div class="col-md-2 col-md-offset-5">
        <CanvasDraw {brushColor} {brushRadius} />
    </div>
  </div>

  <div class="row">
    <div class="col">
      <div class="row">
        <div class="col">

            <div class="form-row align-items-center">
              <div class="col-auto">
                 <label>Brush Color</label>
                  <input type="color" bind:value={brushColor} />
              </div>
              <div class="col-auto">
                 <label>Brush Radius</label>
                  <input type="number" bind:value={brushRadius} />
              </div>
            </div>
        </div>
      </div>
    </div>
  </div>


</div>
