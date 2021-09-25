class Ingredient {
  private _text: string;

  public constructor(text: string) {
    this._text = text;
  }

  /**
   * @return An <li> element displaying this ingredient.
   */
  public toHTML(): HTMLLIElement {
    const li = document.createElement("li");
    li.setAttribute("class", "list-group-item");
    // Add input/display elements to li.
    const textbox = document.createElement("input");
    textbox.className = "text-input";
    textbox.type = "text";
    textbox.value = this._text;
    textbox.oninput = () => {
      // Update the backing state when the text changes.
      this._text = textbox.value;
    };
    li.appendChild(textbox);
    return li;
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

  // Converts the current instance to a li html element with some css classes
  // Similar to toString(), but for html
  public toHTML(): HTMLLIElement {
    const li = document.createElement("li");
    li.setAttribute("class", "list-group-item");
    li.style.position = "relative";
    // Add input/display elements to li.
    const textbox = document.createElement("input");
    textbox.className = "text-input";
    textbox.type = "text";
    textbox.value = this._title;
    textbox.oninput = () => {
      // Update the backing state when the text changes.
      this._title = textbox.value;
    };
    li.appendChild(textbox);
    // Only allow editing after double click.
    // We accomplish this by overlaying a div unless it is
    // being edited.
    const overlayDiv = document.createElement("div");
    overlayDiv.className = "overlay-div";
    overlayDiv.ondblclick = () => {
      overlayDiv.hidden = true;
      textbox.select(); // Select all
    };
    textbox.onblur = () => {
      overlayDiv.hidden = false;
    };
    li.appendChild(overlayDiv);
    // Clicking the li displays the recipe.
    li.onclick = () => {
      // Don't start editing text until double click.
      // TODO
      this.updateIngredientsList();
    };
    return li;
  }

  // When a recipe is clicked, update the ingredients table with each ingredient
  private updateIngredientsList(): void {
    let ingredientList = document.getElementById("ingredient-list")!;
    ingredientList.innerHTML = "";
    for (let ingredient of this._ingredients) {
      ingredientList.appendChild(ingredient.toHTML());
    }
  }
}

class RecipeBox {
  // App state
  private _list: Recipe[];

  constructor() {
    document
      .getElementById("add")!
      .addEventListener("click", this.addRecipe.bind(this));
    this._list = [];
    this.updateView(true);
  }

  // Triggered on button click
  // Inserts to localStorage, updates state and updates view
  private addRecipe(e: Event) {
    e.preventDefault();
    let titleElem: any = document.getElementById("title");
    let ingredientsElem: any = document.getElementById("ingredients");
    let recipe: Recipe = new Recipe(titleElem.value, ingredientsElem.value);

    this._list.push(recipe);
    this.updateView(false, recipe);

    titleElem.value = "";
    ingredientsElem.value = "";
  }

  // Updates recipe html list
  private updateView(initial: boolean, recipe?: Recipe) {
    let table: HTMLElement = document.getElementById("recipe-list")!;
    if (initial) {
      for (let recipe of this._list) table.appendChild(recipe.toHTML());
    } else {
      table.appendChild(recipe!.toHTML());
    }
  }
}
// Start app
let app = new RecipeBox();
