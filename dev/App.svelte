<script>
  import CanvasDraw from "../src/CanvasDraw.svelte";
  let brushColor = "#444";
  let brushRadius = 10;
  let uploadedimage = '';
  let imgSrc = ''

  $: {
    imgSrc = uploadedimage
  }
</script>

<div class="container">
  <div class="row">
    <div class="col-md-2 col-md-offset-5">
        <CanvasDraw {brushColor} {brushRadius} {imgSrc} />

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
              <div class="col-auto">
                 <label>Upload an image</label>
                  <input type="file" bind:value={uploadedimage} />
              </div>
            </div>
        </div>
      </div>
    </div>
  </div>
</div>
