import {
  CObject,
  CrdtInitToken,
  CText,
  DeletingMutCList,
  LwwCRegister,
  Pre,
} from "compoventuals";
import { ContainerRuntimeSource } from "compoventuals-container";

// Import CSS.
import "./style.css";
import "./google_fonts.css";

// Main program.
const UNITS = ["ct", "tsp", "tbsp", "cup", "pt", "qt", "gal", "oz", "lb"];

// TODO: preserve DOM per object, so that it doesn't constantly
// lose focus.

class Ingredient extends CObject {
  private _text: CText;
  private _amount: LwwCRegister<number>;
  private _units: LwwCRegister<string>; // From UNITS.

  private selectionStart: number | null = null;
  private selectionEnd: number | null = null;
  private focused = false;

  constructor(initToken: CrdtInitToken) {
    super(initToken);

    this._text = this.addChild("text", Pre(CText)());
    this._amount = this.addChild("amount", Pre(LwwCRegister)(1));
    this._units = this.addChild("units", Pre(LwwCRegister)("cup"));
  }

  setInitialText(text: string) {
    this._text.insert(0, ...text);
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
    textIn.value = this._text.toString();
    textIn.addEventListener("beforeinput", (e) =>
      this.textInputHandler(e, textIn)
    );
    this.trackSelection(textIn);
    div.appendChild(textIn);
    if (this.focused) {
      setTimeout(() => textIn.focus(), 0);
    }

    const amountIn = document.createElement("input");
    amountIn.className = "ingredient-amount";
    amountIn.type = "number";
    amountIn.min = "0";
    amountIn.step = "0.1";
    amountIn.value = this._amount + "";
    amountIn.oninput = () => {
      if (amountIn.value !== "") {
        this._amount.value = parseFloat(amountIn.value);
      }
    };
    div.appendChild(amountIn);

    const unitsIn = document.createElement("select");
    unitsIn.className = "inflexible";
    for (const unit of UNITS) {
      const option = document.createElement("option");
      option.value = unit;
      option.innerHTML = unit;
      if (unit === this._units.value) option.selected = true;
      unitsIn.appendChild(option);
    }
    unitsIn.onchange = () => {
      this._units.value = unitsIn.value;
    };
    div.appendChild(unitsIn);

    return div;
  }

  private trackSelection(textIn: HTMLInputElement) {
    // Keep our own copy of the selection up-to-date with
    // textIn's.
    const updateSelection = () => {
      // Need to do this on a delay because the event doesn't
      // due its default action (updating the handler) until
      // after the event handlers.
      setTimeout(() => {
        this.selectionStart = textIn.selectionStart;
        this.selectionEnd = textIn.selectionEnd;
      }, 0);
    };
    window.addEventListener("selectionchange", updateSelection);
    textIn.addEventListener("mousedown", updateSelection);
    textIn.addEventListener("mousemove", (e) => {
      if (e.buttons === 1) updateSelection();
    });
    textIn.addEventListener("mouseclick", updateSelection);

    // Same for this.focused.
    textIn.onfocus = () => {
      this.focused = true;
    };
    textIn.onblur = () => {
      this.focused = false;
    };
  }

  private textInputHandler(e: InputEvent, textIn: HTMLInputElement) {
    // Update the backing state when the text changes.
    // Instead of letting the DOM update the text field,
    // we update it ourselves, so that we can capture
    // the intent of the edits in this._text.
    // TODO: cursor management.
    e.preventDefault();
    if (textIn.selectionStart === null || textIn.selectionEnd === null) {
      // Not sure if it this is possible, but we will skip
      // just in case.
      return;
    }
    this.selectionStart = textIn.selectionStart;
    this.selectionEnd = textIn.selectionEnd;
    if (e.inputType.startsWith("insert") && e.data !== null) {
      // Delete any selected text, then insert new text.
      this._text.delete(
        this.selectionStart,
        this.selectionEnd - this.selectionStart
      );
      this._text.insert(this.selectionStart, ...e.data);
      // Move the cursor to the end of the new text.
      this.setCursor(this.selectionStart + e.data.length);
    } else if (e.inputType.startsWith("delete")) {
      if (this.selectionEnd === this.selectionStart) {
        // Nothing is selected, delete next character.
        switch (e.inputType) {
          case "deleteContentForward":
            if (this.selectionStart < this._text.length) {
              this._text.delete(this.selectionStart);
              // Restore the cursor.
              this.setCursor(this.selectionStart);
            }
            break;
          case "deleteContentBackward":
            if (this.selectionStart > 0) {
              this._text.delete(this.selectionStart - 1);
              // Move the cursor backwards.
              this.setCursor(this.selectionStart - 1);
            }
            break;
        }
      } else {
        // Delete the selected text.
        this._text.delete(
          this.selectionStart,
          this.selectionEnd - this.selectionStart
        );
        // Put the cursor at the start of the delete region.
        this.setCursor(this.selectionStart);
      }
    }
  }

  private setCursor(
    newSelectionStart: number,
    newSelectionEnd = newSelectionStart
  ) {
    this.selectionStart = newSelectionStart;
    this.selectionEnd = newSelectionEnd;
  }
}

class Recipe extends CObject {
  private _title: LwwCRegister<string>;
  private _ingredients: DeletingMutCList<Ingredient, []>;

  constructor(initToken: CrdtInitToken, title: string) {
    super(initToken);

    this._title = this.addChild("title", Pre(LwwCRegister)(title));
    this._ingredients = this.addChild(
      "ingredients",
      Pre(DeletingMutCList)((valueInitToken) => new Ingredient(valueInitToken))
    );
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
    const div = document.createElement("div");
    div.className = "recipe-div";

    const titleIn = document.createElement("input");
    titleIn.className = "recipe-input";
    titleIn.type = "text";
    if (!this.editingTitle) {
      // Edits to the title are not committed right away,
      // only once the user is done editing.  Until then,
      // don't overwrite their edits with the stored value.
      titleIn.value = this._title.value;
    }
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
    let ingredientList = document.getElementById("ingredient-list")!;
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
  }
}

class RecipeBook extends CObject {
  private _list: DeletingMutCList<Recipe, [title: string]>;

  constructor(initToken: CrdtInitToken) {
    super(initToken);

    document
      .getElementById("add")!
      .addEventListener("click", this.addRecipe.bind(this));
    this._list = this.addChild(
      "list",
      Pre(DeletingMutCList)(
        (valueInitToken, title) => new Recipe(valueInitToken, title)
      )
    );
    this._list.on("Delete", (e) => {
      if (e.deletedValues.find((value) => value === this._selectedRecipe)) {
        // Deselect the current recipe, since it was deleted.
        this.selectRecipe(null);
      }
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
  }

  /**
   * Renders the selected recipe's ingredients.
   */
  private renderSelectedRecipe() {
    if (this._selectedRecipe === null) {
      // Show no recipe.
      document.getElementById("ingredient-list")!.innerHTML = "";
    } else this._selectedRecipe.renderIngredients();
  }

  renderAll() {
    this.renderRecipes();
    this.renderSelectedRecipe();
  }

  private _selectedRecipe: Recipe | null = null;
  private selectRecipe(recipe: Recipe | null) {
    if (recipe === this._selectedRecipe) return;
    this._selectedRecipe = recipe;
    this.renderAll();
  }
}

// Async so we can await ContainerRuntimeSource.newRuntime.
(async function () {
  // Create a Runtime intended for use within containers.
  const runtime = await ContainerRuntimeSource.newRuntime(window.parent);

  // Start app.
  const app = runtime.registerCrdt("app", Pre(RecipeBook)());
  // Refresh the display when anything changes.
  runtime.on("Change", () => app.renderAll());
})();
