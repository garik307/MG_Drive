// Helpers
const qs = (sel) => document.querySelector(sel);
import SearchEngine from "./ui/SearchEngine.js";
import PaginationManager from "./ui/PaginationManager.js";
import QuestionsUIManager from "./ui/UIManager.js";

// Init
document.addEventListener("DOMContentLoaded", async () => {
    const container = qs("#groups");
    if (!container) return;
    const cards = [...document.querySelectorAll(".group-row")];
    let visible = [...cards];

    const paginator = new PaginationManager({
        container: document.getElementById("groupPage"),
        itemsPerPage: 5
    });

    const ui = new QuestionsUIManager({ cards, paginator });
    ui.refresh(visible);
    // Correct SearchEngine usage
    new SearchEngine({
        input: "#searchInput",
        selector: ".group-row",
        urlParam: "search",
        onSearch: (results) => {
            visible = results;
            ui.refresh(visible);
        }
    });
    
    paginator.onPageChange = (page) => {
        ui.refresh(visible);
    };

    const editButtons = document.querySelectorAll('.edit-group-btn');
    const form = document.querySelector('#editForm');
    editButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            // form.action dynamic
            form.action = `/api/v1/groups/${btn.dataset.id}`;
            const field = form.querySelector(`[name="title"]`);
            const textarea = form.querySelector(`textarea[name="text"]`);
            let dataTitle = btn.dataset.title;

            if(dataTitle) dataTitle = dataTitle.replace(/-/g, '');

            if (field) field.value = `${dataTitle} ${btn.dataset.number}`;
            if (textarea) textarea.value = btn.dataset.text;
        });
    });

    document.addEventListener('click', function(e) {
    if (e.target.classList.contains('description-toggle')) {

        const toggle = e.target;
        const groupId = toggle.getAttribute('data-group-id');

        const container = document.querySelector(
            `.description-container[data-group-id="${groupId}"]`
        );

        const textSpan = container.querySelector('.description-text');
        const fullText = textSpan.getAttribute('data-full-text');
        const isExpanded = toggle.getAttribute('data-expanded') === 'true';

        if (isExpanded) {
            // COLLAPSE
            textSpan.textContent = fullText.substring(0, 50) + "...";
            toggle.className = "bi bi-chevron-down ms-1 description-toggle";
            toggle.setAttribute("data-expanded", "false");
        } else {
            // EXPAND
            textSpan.textContent = fullText;
            toggle.className = "bi bi-chevron-up ms-1 description-toggle";
            toggle.setAttribute("data-expanded", "true");
        }
    }
    });
});
