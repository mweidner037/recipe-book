/* Simple typescript app that stores
 * recipes in local storage. */
class Recipe {
  private _title: string;
  private _ingredients: string;

  public constructor(title: string, ingredients: string) {
    this._title = title;
    this._ingredients = ingredients;
  }

  // Converts the current instance to a li html element with some css classes
  // Similar to toString(), but for html
  public toHTML(): HTMLElement {
    let li: HTMLElement = document.createElement("li");
    li.innerHTML = this._title;
    li.onclick = () => this.updateIngredientsList();
    li.setAttribute("class", "list-group-item");
    return li;
  }

  // When a recipe is clicked, update the ingredients table with each ingredient
  private updateIngredientsList(): void {
    let ingredientList = document.getElementById("ingredient-list")!;
    let ingredients = this._ingredients.split(",");

    ingredientList.innerHTML = "";
    for (let ingredient of ingredients) {
      if (ingredient === "") {
        continue;
      }
      let li = document.createElement("li");
      li.innerHTML = ingredient;
      li.setAttribute("class", "list-group-item");
      ingredientList.appendChild(li);
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
    this.getLocal();
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
    this.updateLocal(this._list);
    this.updateView(false, recipe);

    titleElem.value = "";
    ingredientsElem.value = "";
  }

  // Retreives saved recipes from local storage
  // then converts to JSON and updates state
  private getLocal() {
    let local: any = localStorage.getItem("recipes");
    local = JSON.parse(local);

    if (!local) {
      return;
    }

    for (let recipe of local) {
      this._list.push(new Recipe(recipe._title, recipe._ingredients));
    }
  }

  // Updates localStorage with current state
  private updateLocal = (recipes: Recipe[]): void => {
    localStorage.setItem("recipes", JSON.stringify(recipes));
  };

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
