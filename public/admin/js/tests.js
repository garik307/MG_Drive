// Helpers
const qs = (sel) => document.querySelector(sel);
import SearchEngine from "./ui/SearchEngine.js";
import PaginationManager from "./ui/PaginationManager.js";
import QuestionsUIManager from "./ui/UIManager.js";

// Init
document.addEventListener("DOMContentLoaded", async () => {
    const container = qs("#tests");
    if (!container) return;
    const cards = [...document.querySelectorAll(".test-row")];
    let visible = [...cards];

    const paginator = new PaginationManager({
        container: document.getElementById("testPage"),
        itemsPerPage: 5
    });

    const ui = new QuestionsUIManager({ cards, paginator });
    ui.refresh(visible);
    // Correct SearchEngine usage
    new SearchEngine({
        input: "#searchInput",
        selector: ".test-row",
        urlParam: "search",
        onSearch: (results) => {
            visible = results;
            ui.refresh(visible);
        }
    });
    
    paginator.onPageChange = (page) => {
        ui.refresh(visible);
    };


    const editButtons = document.querySelectorAll('.edit-btn');
    const form = document.querySelector('#editForm');
    editButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const data = JSON.parse(btn.dataset.json);

             let dataTitle = data.title;
            if(dataTitle) dataTitle = dataTitle.replace(/-/g, '');
            

            
            // form.action dynamic
            form.action = `/api/v1/tests/${data.id}`;
            const field = form.querySelector(`[name="title"]`);
            if (field) field.value = `${dataTitle} ${data.number}`;
        });
    });
});
