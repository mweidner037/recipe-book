enum Unit {
  CT = "ct",
  TSP = "tsp",
  TBSP = "tbsp",
  CUP = "cup",
  PT = "pt",
  QT = "qt",
  GAL = "gal",
  OZ = "oz",
  LB = "lb",
}

class Ingredient {
  private _text: string;
  private _amount: number;
  private _units: Unit;

  constructor(text: string) {
    this._text = text;
    this._amount = 1;
    this._units = Unit.CUP;
  }

  scale(scale: number) {
    this._amount *= scale;
  }

  /**
   * @return An HTMLElement displaying this ingredient.
   */
  toHTML(): HTMLElement {
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
    for (const unit of Object.values(Unit)) {
      const option = document.createElement("option");
      option.value = unit;
      option.innerHTML = unit;
      if (unit === this._units) option.selected = true;
      unitsIn.appendChild(option);
    }
    unitsIn.onchange = () => {
      this._units = unitsIn.value as Unit;
    };
    div.appendChild(unitsIn);

    return div;
  }
}

class Recipe {
  private _title: string;
  private _ingredients: Ingredient[];

  // This is saved across re-renders to preserve its value.
  private readonly scaleIn: HTMLInputElement;

  constructor(title: string, ingredientsStr: string) {
    this._title = title;
    this._ingredients = ingredientsStr
      .split(",")
      .map((text) => new Ingredient(text));

    this.scaleIn = document.createElement("input");
    this.scaleIn.className = "ingredient-amount";
    this.scaleIn.type = "number";
    this.scaleIn.min = "0.01";
    this.scaleIn.step = "0.1";
    this.scaleIn.value = "2";
  }

  /**
   * @return An HTMLElement displaying this recipe for the
   * recipe list (not the ingredients themselves).
   */
  toHTML(): HTMLElement {
    const div = document.createElement("div");
    div.className = "recipe-div";

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
      overlayDiv.hidden = true;
      titleIn.select(); // Select all
    };
    titleIn.onblur = () => {
      overlayDiv.hidden = false;
    };
    div.appendChild(overlayDiv);

    return div;
  }

  /**
   * Renders this recipe in the "ingredient-list" element.
   */
  renderIngredients(): void {
    const ingredientList = document.getElementById("ingredient-list")!;
    ingredientList.innerHTML = "";
    for (let i = 0; i < this._ingredients.length; i++) {
      const div = document.createElement("div");
      div.className = "item-div";

      div.appendChild(this._ingredients[i].toHTML());

      // Delete ingredient button.
      const deleteButton = document.createElement("button");
      deleteButton.className = "inflexible";
      deleteButton.innerHTML = "???";
      deleteButton.onclick = () => {
        this._ingredients.splice(i, 1);
        this.renderIngredients();
      };
      div.appendChild(deleteButton);

      const li = document.createElement("li");
      li.className = "list-group-item";
      li.appendChild(div);
      ingredientList.appendChild(li);
    }

    // Add ingredient button.
    const addButton = document.createElement("button");
    addButton.innerHTML = "???";
    addButton.onclick = () => {
      this._ingredients.push(new Ingredient(""));
      this.renderIngredients();
    };
    const addButtonLi = document.createElement("li");
    addButtonLi.className = "add-ingredient";
    addButtonLi.appendChild(addButton);
    ingredientList.appendChild(addButtonLi);

    // Scale recipe button.
    const scaleButton = document.createElement("button");
    scaleButton.innerHTML = "Scale Recipe";
    scaleButton.onclick = () => {
      const scale = parseFloat(this.scaleIn.value);
      if (isNaN(scale) || scale <= 0) return;
      this._ingredients.forEach((ingredient) => ingredient.scale(scale));
      this.renderIngredients();
    };
    const scaleLi = document.createElement("li");
    scaleLi.className = "scale-recipe";
    scaleLi.appendChild(scaleButton);
    scaleLi.appendChild(this.scaleIn);
    ingredientList.appendChild(scaleLi);
  }
}

class RecipeBook {
  private _list: Recipe[];

  constructor() {
    document
      .getElementById("add")!
      .addEventListener("click", this.addRecipe.bind(this));
    this._list = [];
    this.renderRecipes();
  }

  /**
   * Listener for "add" button onclick.
   *
   * Adds a new recipe based on the recipe column input.
   */
  private addRecipe(e: Event) {
    e.preventDefault();

    const titleElem = <HTMLInputElement>document.getElementById("title");
    const ingredientsElem = <HTMLInputElement>(
      document.getElementById("ingredients")
    );

    const recipe = new Recipe(titleElem.value, ingredientsElem.value);
    this._list.push(recipe);

    // Update display.
    titleElem.value = "";
    ingredientsElem.value = "";
    this.selectRecipe(recipe);
  }

  /**
   * Renders the recipe titles in the "recipe-list" element.
   */
  private renderRecipes() {
    const table = document.getElementById("recipe-list")!;
    table.innerHTML = "";
    for (let i = 0; i < this._list.length; i++) {
      const recipe = this._list[i];
      const div = document.createElement("div");
      div.className = "item-div";

      div.appendChild(recipe.toHTML());

      // Delete recipe button.
      const deleteButton = document.createElement("button");
      deleteButton.className = "inflexible";
      deleteButton.innerHTML = "???";
      deleteButton.onclick = (e) => {
        e.stopPropagation(); // Don't do li.onclick.
        this._list.splice(i, 1);
        if (this._selectedRecipe === recipe) {
          // Deselect it and stop showing it.
          this.selectRecipe(null);
        } else this.renderRecipes();
      };
      div.appendChild(deleteButton);

      const li = document.createElement("li");
      li.className = "list-group-item";
      li.appendChild(div);
      // Clicking the li displays the recipe.
      li.onclick = () => {
        this.selectRecipe(recipe);
      };

      // Highlight the selected recipe, and don't do the hover stuff.
      if (recipe === this._selectedRecipe) {
        li.style.cursor = "default";
        li.style.backgroundColor = "#a0a0ff";
        li.style.color = "black";
      }

      table.appendChild(li);
    }
  }

  private _selectedRecipe: Recipe | null = null;
  private selectRecipe(recipe: Recipe | null) {
    if (recipe === this._selectedRecipe) return;
    this._selectedRecipe = recipe;
    this.renderRecipes();
    if (recipe === null) {
      // Show no recipe.
      document.getElementById("ingredient-list")!.innerHTML = "";
    } else recipe.renderIngredients();
  }
}

// Start app.
new RecipeBook();
