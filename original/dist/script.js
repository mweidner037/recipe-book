"use strict";
/* Simple typescript app that stores
 * recipes in local storage. */
class Recipe {
    constructor(title, ingredients) {
        this._title = title;
        this._ingredients = ingredients;
    }
    // Converts the current instance to a li html element with some css classes
    // Similar to toString(), but for html
    toHTML() {
        let li = document.createElement("li");
        li.innerHTML = this._title;
        li.onclick = () => this.updateIngredientsList();
        li.setAttribute("class", "list-group-item");
        return li;
    }
    // When a recipe is clicked, update the ingredients table with each ingredient
    updateIngredientsList() {
        let ingredientList = document.getElementById("ingredient-list");
        let ingredients = this._ingredients.split(",");
        ingredientList.innerHTML = "";
        for (let ingredient of ingredients) {
            if (ingredient === "") {
                continue;
            }
            ;
            let li = document.createElement("li");
            li.innerHTML = ingredient;
            li.setAttribute("class", "list-group-item");
            ingredientList.appendChild(li);
        }
    }
}
class RecipeBox {
    constructor() {
        // Updates localStorage with current state
        this.updateLocal = (recipes) => {
            localStorage.setItem("recipes", JSON.stringify(recipes));
        };
        document.getElementById("add").addEventListener("click", this.addRecipe.bind(this));
        this._list = [];
        this.getLocal();
        this.updateView(true);
    }
    // Triggered on button click
    // Inserts to localStorage, updates state and updates view
    addRecipe(e) {
        e.preventDefault();
        let titleElem = document.getElementById("title");
        let ingredientsElem = document.getElementById("ingredients");
        let recipe = new Recipe(titleElem.value, ingredientsElem.value);
        this._list.push(recipe);
        this.updateLocal(this._list);
        this.updateView(false, recipe);
        titleElem.value = "";
        ingredientsElem.value = "";
    }
    // Retreives saved recipes from local storage
    // then converts to JSON and updates state
    getLocal() {
        let local = localStorage.getItem("recipes");
        local = JSON.parse(local);
        if (!local) {
            return;
        }
        for (let recipe of local) {
            this._list.push(new Recipe(recipe._title, recipe._ingredients));
        }
    }
    // Updates recipe html list
    updateView(initial, recipe) {
        let table = document.getElementById("recipe-list");
        if (initial) {
            for (let recipe of this._list)
                table.appendChild(recipe.toHTML());
        }
        else {
            table.appendChild(recipe.toHTML());
        }
    }
}
// Start app
let app = new RecipeBox();