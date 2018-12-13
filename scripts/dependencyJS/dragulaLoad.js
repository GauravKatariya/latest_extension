var Drake = dragula({
    moves: (el, source, handle, sibling) => !el.classList.contains('ignoreItem')
})
    .on('drag', function (el) {
        dict[el.attributes.id.value].forEach(element => {
            element["line"].dash = { animation: true };
        });
        dict[el.attributes.id.value].forEach(element => {
            element["line"].position();
        });
    })
    .on('dragend', function (el, container) {
        dict[el.attributes.id.value].forEach(element => {
            element["line"].dash = false;
        });

        for (key in dict) {
            dict[key].forEach(element => {
                element["line"].position();
            })
        }
    })
