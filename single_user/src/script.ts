const UNITS = ["ct", "tsp", "tbsp", "cup", "pt", "qt", "gal", "oz", "lb"];

class Ingredient {
  private _text: string;
  private _amount: number;
  private _units: string; // From UNITS.

  public constructor(text: string) {
    this._text = text;
    this._amount = 1;
    this._units = "cup";
  }

  /**
   * @return An HTMLElement displaying this ingredient.
   */
  public toHTML(): HTMLElement {
    const div = document.createElement("div");
    div.className = "ingredient-div";

    const textIn = document.createElement("input");
    textIn.className = "ingredient-text";
    textIn.type = "text";
    textIn.value = this._text;
    textIn.oninput = () => {
      // Update the backing state when the text changes.
      this._text = textIn.value;
    };
    div.appendChild(textIn);

    const amountIn = document.createElement("input");
    amountIn.className = "ingredient-amount";
    amountIn.type = "number";
    amountIn.min = "0";
    amountIn.step = "0.1";
    amountIn.value = this._amount + "";
    amountIn.oninput = () => {
      if (amountIn.value !== "") {
        this._amount = parseFloat(amountIn.value);
      }
    };
    div.appendChild(amountIn);

    const unitsIn = document.createElement("select");
    unitsIn.className = "inflexible";
    for (const unit of UNITS) {
      const option = document.createElement("option");
      option.value = unit;
      option.innerHTML = unit;
      if (unit === this._units) option.selected = true;
      unitsIn.appendChild(option);
    }
    unitsIn.onchange = () => {
      this._units = unitsIn.value;
    };
    div.appendChild(unitsIn);

    return div;
  }
}

class Recipe {
  private _title: string;
  private _ingredients: Ingredient[];

  public constructor(title: string, ingredients: string) {
    this._title = title;
    this._ingredients = ingredients
      .split(",")
      .map((text) => new Ingredient(text));
  }

  // Converts the current instance to a html element with some css classes
  // Similar to toString(), but for html
  public toHTML(): HTMLElement {
    const div = document.createElement("div");
    div.className = "recipe-div";
    // li.style.position = "relative";
    // Add input/display elements to li.
    const titleIn = document.createElement("input");
    titleIn.className = "recipe-input";
    titleIn.type = "text";
    titleIn.value = this._title;
    titleIn.oninput = () => {
      // Update the backing state when the text changes.
      this._title = titleIn.value;
    };
    div.appendChild(titleIn);
    // Only allow editing after double click.
    // We accomplish this by overlaying a div unless it is
    // being edited.
    const overlayDiv = document.createElement("div");
    overlayDiv.className = "overlay-div";
    overlayDiv.ondblclick = () => {
      console.log("dblclick");
      overlayDiv.hidden = true;
      titleIn.select(); // Select all
    };
    titleIn.onblur = () => {
      overlayDiv.hidden = false;
    };
    div.appendChild(overlayDiv);
    return div;
  }

  // When a recipe is clicked, update the ingredients table with each ingredient
  public updateIngredientsList(): void {
    let ingredientList = document.getElementById("ingredient-list")!;
    ingredientList.innerHTML = "";
    for (let i = 0; i < this._ingredients.length; i++) {
      const div = document.createElement("div");
      div.className = "item-div";

      div.appendChild(this._ingredients[i].toHTML());

      // Delete ingredient button.
      const deleteButton = document.createElement("button");
      deleteButton.className = "inflexible";
      deleteButton.innerHTML = "❌";
      deleteButton.onclick = () => {
        this._ingredients.splice(i, 1);
        this.updateIngredientsList();
      };
      div.appendChild(deleteButton);

      const li = document.createElement("li");
      li.setAttribute("class", "list-group-item");
      li.appendChild(div);
      ingredientList.appendChild(li);
    }
    // Add ingredient button.
    const addButton = document.createElement("button");
    addButton.innerHTML = "➕";
    addButton.onclick = () => {
      this._ingredients.push(new Ingredient(""));
      this.updateIngredientsList();
    };
    const addButtonLi = document.createElement("li");
    addButtonLi.className = "add-ingredient";
    addButtonLi.appendChild(addButton);
    ingredientList.appendChild(addButtonLi);
  }
}

class RecipeBook {
  // App state
  private _list: Recipe[];

  constructor() {
    document
      .getElementById("add")!
      .addEventListener("click", this.addRecipe.bind(this));
    this._list = [];
    this.updateView();
  }

  // Triggered on button click
  // Inserts to localStorage, updates state and updates view
  private addRecipe(e: Event) {
    e.preventDefault();
    let titleElem: any = document.getElementById("title");
    let ingredientsElem: any = document.getElementById("ingredients");
    let recipe: Recipe = new Recipe(titleElem.value, ingredientsElem.value);

    this._list.push(recipe);
    this.updateView();
    titleElem.value = "";
    ingredientsElem.value = "";
    this.selectRecipe(recipe);
  }

  // Updates recipe html list
  private updateView() {
    let table: HTMLElement = document.getElementById("recipe-list")!;
    table.innerHTML = "";
    for (let i = 0; i < this._list.length; i++) {
      const recipe = this._list[i];
      const div = document.createElement("div");
      div.className = "item-div";

      div.appendChild(recipe.toHTML());

      // Delete recipe button.
      const deleteButton = document.createElement("button");
      deleteButton.className = "inflexible";
      deleteButton.innerHTML = "❌";
      deleteButton.onclick = (e) => {
        this._list.splice(i, 1);
        this.updateView();
        document.getElementById("ingredient-list")!.innerHTML = "";
        e.stopPropagation(); // Don't do li.onclick.
      };
      div.appendChild(deleteButton);

      const li = document.createElement("li");
      li.setAttribute("class", "list-group-item");
      li.appendChild(div);
      // Clicking the li displays the recipe.
      li.onclick = () => {
        this.selectRecipe(recipe);
      };
      // Highlight the selected recipe, and don't do the hover stuff.
      if (recipe === this.selectedRecipe) {
        li.style.cursor = "default";
        li.style.backgroundColor = "#a0a0ff";
        li.style.color = "black";
      }
      table.appendChild(li);
    }
  }

  private selectedRecipe: Recipe | null = null;
  private selectRecipe(recipe: Recipe | null) {
    if (recipe === this.selectedRecipe) return;
    this.selectedRecipe = recipe;
    this.updateView();
    if (recipe !== null) recipe.updateIngredientsList();
  }
}
// Start app
let app = new RecipeBook();
