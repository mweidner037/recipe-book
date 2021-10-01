import {
  CausalTimestamp,
  CMessenger,
  CObject,
  CPrimitive,
  CrdtEventMeta,
  CrdtInitToken,
  CRegister,
  DefaultElementSerializer,
  LwwMutCRegister,
  Pre,
  SemidirectProductStore,
} from "compoventuals";

// TODO: deal with floating point non-commutativity
class MultNumber extends CPrimitive {
  private _value: number;
  private readonly numberSerializer =
    DefaultElementSerializer.getInstance<number>();

  constructor(initToken: CrdtInitToken, initialValue: number) {
    super(initToken);
    this._value = initialValue;
  }

  mult(toMult: number) {
    if (toMult !== 1) {
      super.send(this.numberSerializer.serialize(toMult));
    }
  }

  get value(): number {
    return this._value;
  }

  protected receivePrimitive(timestamp: CausalTimestamp, message: Uint8Array) {
    let decoded = this.numberSerializer.deserialize(message, this.runtime);
    this._value *= decoded;
    this.emit("Change", { meta: CrdtEventMeta.fromTimestamp(timestamp) });
  }

  canGc(): boolean {
    return false;
  }

  savePrimitive(): Uint8Array {
    return this.numberSerializer.serialize(this._value);
  }

  loadPrimitive(saveData: Uint8Array) {
    this._value = this.numberSerializer.deserialize(saveData, this.runtime);
  }
}

export class MultableCRegister extends CObject implements CRegister<number> {
  // TODO: set an initial value in mutRegister instead.
  private readonly initialMultNumber: MultNumber;
  private readonly mutRegister: LwwMutCRegister<MultNumber, [number]>;
  private readonly semidirectStore: SemidirectProductStore<number, number>;
  private readonly multMessenger: CMessenger<number>;

  constructor(initToken: CrdtInitToken, initialValue: number) {
    super(initToken);

    this.initialMultNumber = this.addChild(
      "initial",
      Pre(MultNumber)(initialValue)
    );
    this.mutRegister = this.addChild(
      "",
      Pre(LwwMutCRegister)((valueInitToken, initialValue) => {
        const multNumber = new MultNumber(valueInitToken, initialValue);
        multNumber.on("Change", (e) => this.emit("Change", e));
        return multNumber;
      })
    );
    this.semidirectStore = this.addChild(
      "0",
      Pre(SemidirectProductStore)(this.action.bind(this))
    );
    this.multMessenger = this.addChild("1", Pre(CMessenger)());

    // Semidirect events.
    this.mutRegister.on("Set", (e) => {
      // Act on the newly set value.
      const multNumber = this.mutRegister.value.get();
      const factor = this.semidirectStore.processM1(1, e.meta.timestamp)!;
      this.runtime.runLocally(() => multNumber.mult(factor));
    });
    this.multMessenger.on("Message", (e) => {
      // Store the message.
      this.semidirectStore.processM2(e.message, e.meta.timestamp);
      // Act on all current values.
      this.runtime.runLocally(() => {
        this.initialMultNumber.mult(e.message);
        this.mutRegister
          .conflicts()
          .forEach((multNumber) => multNumber.mult(e.message));
      });
    });

    // Emit events.
    this.initialMultNumber.on("Change", (e) => this.emit("Change", e));
    this.mutRegister.on("Change", (e) => this.emit("Change", e));
  }

  private action(m2: number, m1: number): number {
    return m2 * m1;
  }

  mult(toMult: number) {
    if (toMult !== 1) {
      this.multMessenger.sendMessage(toMult);
    }
  }

  set(value: number): number {
    this.mutRegister.set(value);
    return this.value;
  }

  set value(value: number) {
    this.set(value);
  }

  get value(): number {
    const multNumber = this.mutRegister.value;
    return multNumber.isPresent
      ? multNumber.get().value
      : this.initialMultNumber.value;
  }
}
