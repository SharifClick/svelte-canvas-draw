<script>
  import CanvasDraw from "../src/CanvasDraw.svelte";
  let brushColor = "#444";
  let brushRadius = 10;
  let bgImage = "./images/cat.png";
  let imgBase64 = null;
  let SDraw = null;

  function setUploadedImage(e) {
    // console.log(fileUploader.files)
    console.log(e.target.files[0]);

    if (e.target.files[0]) {
      let reader = new FileReader();
      reader.readAsDataURL(e.target.files[0]);
      console.log(reader.result);
      reader.onload = ev => {
        // console.log(ev.target.result)
        // imgBase64 = reader.result;
        imgBase64 = ev.target.result;
        setBgImage();
      };
    }
  }

  function downloadDrawingFile(contentBase64) {
    const downloadLink = document.createElement('a');
    document.body.appendChild(downloadLink);

    downloadLink.href = contentBase64;
    downloadLink.target = '_self';
    downloadLink.download = 'svelte-draw-export-'+(new Date());
    downloadLink.click();
  }

  function setBgImage() {
    bgImage = imgBase64;
  }

  function clear() {
    SDraw.clearDrawings();
  }

  function undo() {
    SDraw.undoDrawings();
  }

  function get_image_data() {
    let preparedDS = SDraw.get_image_data();
    downloadDrawingFile(preparedDS);
  }
</script>

<div class="container">
  <div class="row">
    <div class="col">
      <div class="row">
        <div class="col d-flex justify-content-center">
          <h2>Plain draw board</h2>
        </div>
      </div>
      <div class="row">
        <div class="col d-flex justify-content-center">
          <CanvasDraw {brushColor} {brushRadius} />
        </div>
      </div>

      <div class="row">
        <div class="col">
          <div class="row">
            <div class="col d-flex justify-content-center">

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
    <div class="col">

      <div class="row">
        <div class="col d-flex justify-content-center">
          <h2>Draw board with img background</h2>
        </div>
      </div>
      <div class="row">
        <div class="col d-flex justify-content-center">
          <CanvasDraw
            bind:this={SDraw}
            {brushColor}
            {brushRadius}
            imgSrc={bgImage}
            canvasWidth="640" />
        </div>
      </div>
      <hr>
      <div class="row">
        <div class="col">
          <div class="row">
            <div class="col d-flex justify-content-center">

              <div class="form-row align-items-center">
                <div class="col-auto">
                  <button  class="btn btn-primary" on:click={clear}>Clear</button>
                </div>
                <div class="col-auto">
                  <button class="btn btn-primary" on:click={undo}>Undo</button>
                </div>
                <div class="col-auto">
                  <button class="btn btn-primary">Save</button>
                </div>
                <div class="col-auto" >
                  <button class="btn btn-primary" on:click={get_image_data}>Download</button>
                </div>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col d-flex justify-content-center">

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
                  <label>File Upload</label>
                  <input type="file" on:change={setUploadedImage} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

</div>
