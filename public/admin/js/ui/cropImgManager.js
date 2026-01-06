document.addEventListener('DOMContentLoaded', () => {
    const selectImageBtn = document.querySelectorAll('#selectImageBtn');
    const cropModal = new bootstrap.Modal(document.getElementById('cropModal'));
    const imageToCrop = document.getElementById('imageToCrop');
    const cropButton = document.getElementById('cropButton');
    const croppedFileInput = document.getElementById('croppedFileInput');
    const externalPreview = document.getElementById('externalPreview');

    let cropper = null;
    let imageURL = '';

    // 1. Create a hidden file input 
    const actualFileInput = document.createElement('input');
    actualFileInput.type = 'file';
    actualFileInput.accept = 'image/*';
    actualFileInput.style.display = 'none';
    document.body.appendChild(actualFileInput);

    selectImageBtn.forEach(btn => {
        btn.addEventListener('click', () => {
            actualFileInput.click();
        });
    })

    // 2. File selection 
    actualFileInput.addEventListener('change', (event) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const file = files[0];

            // Destroy previous 
            if (cropper) {
                cropper.destroy();
                cropper = null;
            }

            // Create image URL
            imageURL = URL.createObjectURL(file);
            imageToCrop.src = imageURL;

            // Open the modal
            cropModal.show();
        }
    });

    // 3. Init Cropper
    document.getElementById('cropModal').addEventListener('shown.bs.modal', () => {
        // Crop initialization
        cropper = new Cropper(imageToCrop, {
            // Setting 
            aspectRatio: NaN,
            viewMode: 1,
            movable: true,
            scalable: true,
            zoomable: true,
        });
    });

    // 4. Clean up Cropper
    document.getElementById('cropModal').addEventListener('hidden.bs.modal', () => {
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        if (imageURL) {
            URL.revokeObjectURL(imageURL);
            imageURL = '';
        }
        actualFileInput.value = '';
    });


    if(cropButton) {
        // 5. Crop 
        cropButton.addEventListener('click', () => {
            if (!cropper) return;
    
            // Get cropped image
            cropper.getCroppedCanvas().toBlob((blob) => {
                if (!blob) return;
    
                // 5.1. Create a File 
                const croppedFile = new File([blob], "cropped_image.png", {
                    type: blob.type
                });
    
                // 5.2. Update input[type="file"] field 
                try {
                    // DataTransfer 
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(croppedFile);
                    croppedFileInput.files = dataTransfer.files;
                    window.finalCroppedFile = croppedFile;
                } catch (e) {
                    // console.error("Failed to set file using DataTransfer:", e);
                    window.finalCroppedFile = croppedFile;
                }
    
                // 5.3. Update preview
                externalPreview.innerHTML = `<img src="${URL.createObjectURL(blob)}" alt="Cropped Preview">`;
    
                // Close the modal
                cropModal.hide();
            }, 'image/png');
        });
    }
});
