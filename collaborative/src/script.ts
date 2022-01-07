import {
  CObject,
  InitToken,
  CText,
  DeletingMutCList,
  LwwCRegister,
  Pre,
} from "@collabs/collabs";
import { ContainerAppSource } from "@collabs/container";
import { connectTextInput } from "./connect_text_input";
import { MultableCRegister } from "./amount_register";

// Import CSS and fonts.
import "./google_fonts.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "./fonts/FwZY7-Qmy14u9lezJ-6H6Mk.woff2";
import "./fonts/S6uyw4BMUTPHjx4wXg.woff2";
import "./style.css";

// Main program.
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

class Ingredient extends CObject {
  private _text: CText;
  private _amount: MultableCRegister;
  private _units: LwwCRegister<Unit>;

  private _div: HTMLDivElement;

  constructor(initToken: InitToken) {
    super(initToken);

    this._text = this.addChild("text", Pre(CText)());
    this._amount = this.addChild("amount", Pre(MultableCRegister)(1));
    this._units = this.addChild("units", Pre(LwwCRegister)<Unit>(Unit.CUP));

    this._div = this.createDiv();
  }

  setInitialText(text: string) {
    this._text.insert(0, ...text);
  }

  scale(scale: number) {
    // TODO: also affect concurrent sets
    this._amount.mult(scale);
  }

  /**
   * @return An HTMLElement displaying this ingredient.
   */
  toHTML() {
    return this._div;
  }

  private createDiv(): HTMLDivElement {
    const div = document.createElement("div");
    div.className = "ingredient-div";

    const textIn = document.createElement("input");
    textIn.className = "ingredient-text";
    textIn.type = "text";
    textIn.value = this._text.toString();
    connectTextInput(this._text, textIn);
    div.appendChild(textIn);

    const amountIn = document.createElement("input");
    amountIn.className = "ingredient-amount";
    amountIn.type = "number";
    amountIn.min = "0";
    amountIn.step = "0.1";
    amountIn.value = this._amount.value + "";
    amountIn.oninput = () => {
      if (amountIn.value !== "") {
        this._amount.value = parseFloat(amountIn.value);
      }
    };
    this._amount.on("Any", () => {
      amountIn.value = this._amount.value + "";
    });
    div.appendChild(amountIn);

    const unitsIn = document.createElement("select");
    unitsIn.className = "inflexible";
    const optionsByUnit = new Map<string, HTMLOptionElement>();
    for (const unit of Object.values(Unit)) {
      const option = document.createElement("option");
      optionsByUnit.set(unit, option);
      option.value = unit;
      option.innerHTML = unit;
      if (unit === this._units.value) option.selected = true;
      unitsIn.appendChild(option);
    }
    unitsIn.onchange = () => {
      this._units.value = unitsIn.value as Unit;
    };
    this._units.on("Set", () => {
      optionsByUnit.get(this._units.value)!.selected = true;
    });
    div.appendChild(unitsIn);

    return div;
  }
}

class Recipe extends CObject {
  private _title: LwwCRegister<string>;
  private _ingredients: DeletingMutCList<Ingredient, []>;

  // This is saved across re-renders to preserve its value.
  private readonly scaleIn: HTMLInputElement;

  private _div: HTMLDivElement;

  private _recipeBook: RecipeBook;

  constructor(initToken: InitToken, recipeBook: RecipeBook, title: string) {
    super(initToken);
    this._recipeBook = recipeBook;

    this._title = this.addChild("title", Pre(LwwCRegister)(title));
    this._ingredients = this.addChild(
      "ingredients",
      Pre(DeletingMutCList)((valueInitToken) => new Ingredient(valueInitToken))
    );

    this._ingredients.on("Any", () => {
      if (this._recipeBook.selectedRecipe === this) {
        // Re-render the list of ingredients.
        this.renderIngredients();
      }
    });

    this.scaleIn = document.createElement("input");
    this.scaleIn.className = "ingredient-amount";
    this.scaleIn.type = "number";
    this.scaleIn.min = "0.01";
    this.scaleIn.step = "0.1";
    this.scaleIn.value = "2";

    this._div = this.createDiv();
  }

  addInitialIngredients(ingredientsStr: string) {
    ingredientsStr.split(",").forEach((ingredientText) => {
      const ingredient = this._ingredients.push();
      ingredient.setInitialText(ingredientText);
    });
  }

  private editingTitle = false;

  /**
   * @return An HTMLElement displaying this recipe for the
   * recipe list (not the ingredients themselves).
   */
  toHTML(): HTMLElement {
    return this._div;
  }

  createDiv(): HTMLDivElement {
    const div = document.createElement("div");
    div.className = "recipe-div";

    const titleIn = document.createElement("input");
    titleIn.className = "recipe-input";
    titleIn.type = "text";
    titleIn.value = this._title.value;
    this._title.on("Set", () => {
      if (!this.editingTitle) {
        // Edits to the title are not committed right away,
        // only once the user is done editing.  Until then,
        // don't overwrite their edits with the stored value.
        titleIn.value = this._title.value;
      }
    });
    div.appendChild(titleIn);

    // Only allow editing after double click.
    // We accomplish this by overlaying a div unless it is
    // being edited.
    const overlayDiv = document.createElement("div");
    overlayDiv.className = "overlay-div";
    overlayDiv.ondblclick = () => {
      this.editingTitle = true;
      overlayDiv.hidden = true;
      titleIn.select(); // Select all
    };
    titleIn.onblur = () => {
      this.editingTitle = false;
      overlayDiv.hidden = false;
      // Commit the edited value.
      this._title.value = titleIn.value;
    };
    div.appendChild(overlayDiv);

    return div;
  }

  /**
   * Renders this recipe in the "ingredient-list" element.
   */
  renderIngredients(): void {
    const ingredientList = document.getElementById("ingredient-list")!;
    // Preserve focus across this reset.
    const focused = document.activeElement;

    ingredientList.innerHTML = "";
    for (let i = 0; i < this._ingredients.length; i++) {
      const div = document.createElement("div");
      div.className = "item-div";

      div.appendChild(this._ingredients.get(i).toHTML());

      // Delete ingredient button.
      const deleteButton = document.createElement("button");
      deleteButton.className = "inflexible";
      deleteButton.innerHTML = "❌";
      deleteButton.onclick = () => {
        this._ingredients.delete(i);
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
    addButton.innerHTML = "➕";
    addButton.onclick = () => {
      this._ingredients.push();
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
      // TODO: Proper list foreach, that also affects
      // concurrently added ingredients.
      this._ingredients.forEach((ingredient) => ingredient.scale(scale));
      this.renderIngredients();
    };
    const scaleLi = document.createElement("li");
    scaleLi.className = "scale-recipe";
    scaleLi.appendChild(scaleButton);
    scaleLi.appendChild(this.scaleIn);
    ingredientList.appendChild(scaleLi);

    if (focused !== null && focused instanceof HTMLElement) {
      focused.focus();
    }
  }
}

class RecipeBook extends CObject {
  private _list: DeletingMutCList<Recipe, [title: string]>;

  constructor(initToken: InitToken) {
    super(initToken);

    document
      .getElementById("add")!
      .addEventListener("click", this.addRecipe.bind(this));

    this._list = this.addChild(
      "list",
      Pre(DeletingMutCList)(
        (valueInitToken, title) => new Recipe(valueInitToken, this, title)
      )
    );
    this._list.on("Delete", (e) => {
      if (e.deletedValues.find((value) => value === this._selectedRecipe)) {
        // Deselect the current recipe, since it was deleted.
        this.selectRecipe(null);
      }
    });
    this._list.on("Any", () => {
      // Re-render the list of recipes.
      this.renderRecipes();
    });

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

    const recipe = this._list.push(titleElem.value);
    recipe.addInitialIngredients(ingredientsElem.value);

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
    // Preserve focus across this reset.
    const focused = document.activeElement;

    table.innerHTML = "";
    for (let i = 0; i < this._list.length; i++) {
      const recipe = this._list.get(i);
      const div = document.createElement("div");
      div.className = "item-div";

      div.appendChild(recipe.toHTML());

      // Delete recipe button.
      const deleteButton = document.createElement("button");
      deleteButton.className = "inflexible";
      deleteButton.innerHTML = "❌";
      deleteButton.onclick = (e) => {
        e.stopPropagation(); // Don't do li.onclick.
        this._list.delete(i);
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

    if (focused !== null && focused instanceof HTMLElement) {
      focused.focus();
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

  get selectedRecipe(): Recipe | null {
    return this._selectedRecipe;
  }
}

// Async so we can await ContainerAppSource.newRuntime.
(async function () {
  // Create a CRDTApp intended for use within containers.
  const app = await ContainerAppSource.newApp(window.parent);

  // Start app.
  app.registerCollab("app", Pre(RecipeBook)());
})();
