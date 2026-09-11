# TrustChain: escrow smart contract (PyTeal)
# Holds funds temporarily during the x402 settlement handshake.

# pyrefly: ignore [missing-import]
from pyteal import App, Assert, Bytes, Cond, Int, Mode, OnComplete, Return, Seq, Txn, compileTeal

def approval_program():
    on_creation = Seq([
        App.globalPut(Bytes("Admin"), Txn.sender()),
        Return(Int(1))
    ])

    is_admin = Txn.sender() == App.globalGet(Bytes("Admin"))

    # mock logic for releasing funds
    release_funds = Seq([
        Assert(is_admin),
        # inner transaction to send funds would go here
        Return(Int(1))
    ])

    program = Cond(
        [Txn.application_id() == Int(0), on_creation],
        [Txn.on_completion() == OnComplete.NoOp, release_funds],
        [Txn.on_completion() == OnComplete.OptIn, Return(Int(1))]
    )
    
    return program

def clear_state_program():
    return Return(Int(1))

if __name__ == "__main__":
    with open("escrow.teal", "w") as f:
        compiled = compileTeal(approval_program(), mode=Mode.Application, version=5)
        f.write(compiled)
