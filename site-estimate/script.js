const prices = {
    types: {
        landing: { label: "Лендинг", price: 3600, days: [4, 6], includedPages: 1 },
        business: { label: "Сайт компании", price: 6400, days: [7, 10], includedPages: 5 },
        catalog: { label: "Каталог", price: 9000, days: [10, 14], includedPages: 8 },
        webapp: { label: "Веб-приложение", price: 12000, days: [14, 21], includedPages: 3 }
    },
    page: 500,
    features: {
        form: { label: "Форма заявки", price: 600, days: 1 },
        animation: { label: "Анимации", price: 800, days: 1 },
        cms: { label: "Редактирование контента", price: 2000, days: 3 },
        analytics: { label: "Аналитика", price: 500, days: 1 }
    },
    deadlines: {
        standard: { label: "Обычный срок", multiplier: 1 },
        fast: { label: "Быстрый срок", multiplier: 1.2 },
        urgent: { label: "Срочный запуск", multiplier: 1.4 }
    }
};

const form = document.querySelector("#estimate-form");
const siteType = document.querySelector("#site-type");
const pages = document.querySelector("#pages");
const pagesValue = document.querySelector("#pages-value");
const totalPrice = document.querySelector("#total-price");
const duration = document.querySelector("#duration");
const breakdownList = document.querySelector("#breakdown-list");
const copyButton = document.querySelector("#copy-button");
const resetButton = document.querySelector("#reset-button");
const copyStatus = document.querySelector("#copy-status");

const money = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });

function calculate() {
    const type = prices.types[siteType.value];
    const pageCount = Number(pages.value);
    const extraPages = Math.max(0, pageCount - type.includedPages);
    const selectedFeatures = [...form.querySelectorAll('input[name="feature"]:checked')]
        .map((input) => prices.features[input.value]);
    const deadlineKey = form.elements.deadline.value;
    const deadline = prices.deadlines[deadlineKey];

    const pageCost = extraPages * prices.page;
    const featureCost = selectedFeatures.reduce((sum, feature) => sum + feature.price, 0);
    const subtotal = type.price + pageCost + featureCost;
    const total = Math.round((subtotal * deadline.multiplier) / 100) * 100;
    const addedDays = Math.ceil(extraPages / 3) + selectedFeatures.reduce((sum, feature) => sum + feature.days, 0);
    const speedFactor = deadlineKey === "standard" ? 1 : deadlineKey === "fast" ? 0.8 : 0.65;
    const minDays = Math.max(2, Math.ceil((type.days[0] + addedDays) * speedFactor));
    const maxDays = Math.max(minDays + 1, Math.ceil((type.days[1] + addedDays) * speedFactor));

    const rows = [{ label: type.label, value: type.price }];
    if (pageCost) rows.push({ label: `Дополнительные страницы: ${extraPages}`, value: pageCost });
    selectedFeatures.forEach((feature) => rows.push({ label: feature.label, value: feature.price }));
    if (deadline.multiplier > 1) rows.push({ label: deadline.label, value: total - subtotal });

    pagesValue.value = pageCount;
    totalPrice.textContent = money.format(total);
    duration.textContent = `Ориентировочный срок: ${minDays}–${maxDays} дней`;
    breakdownList.replaceChildren(...rows.map((row) => {
        const item = document.createElement("li");
        const label = document.createElement("span");
        const value = document.createElement("span");
        label.textContent = row.label;
        value.textContent = money.format(row.value);
        item.append(label, value);
        return item;
    }));

    return { type: type.label, pageCount, selectedFeatures, deadline: deadline.label, total, minDays, maxDays };
}

async function copyEstimate() {
    const result = calculate();
    const features = result.selectedFeatures.length
        ? result.selectedFeatures.map((feature) => feature.label).join(", ")
        : "без дополнительных функций";
    const text = [
        "Предварительный расчёт сайта",
        `Тип: ${result.type}`,
        `Страниц: ${result.pageCount}`,
        `Функции: ${features}`,
        `Срок: ${result.deadline}, ориентировочно ${result.minDays}–${result.maxDays} дней`,
        `Стоимость: ${money.format(result.total)}`
    ].join("\n");

    try {
        await navigator.clipboard.writeText(text);
        copyStatus.textContent = "Расчёт скопирован";
    } catch {
        copyStatus.textContent = "Не удалось скопировать автоматически";
    }
}

form.addEventListener("input", () => {
    copyStatus.textContent = "";
    calculate();
});

copyButton.addEventListener("click", copyEstimate);
resetButton.addEventListener("click", () => {
    form.reset();
    pages.value = "1";
    copyStatus.textContent = "Параметры сброшены";
    calculate();
});

calculate();

