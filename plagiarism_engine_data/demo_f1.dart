import 'package:core_database/core_database.dart';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:core_data/src/services/auto_categorization_service.dart';
import 'package:uuid/uuid.dart';

// Temporary model for simulation until db schema is updated for imported transactions
class BankTransaction {
  final String id;
  final DateTime date;
  final String description;
  final double amount;

  BankTransaction({
    required this.id,
    required this.date,
    required this.description,
    required this.amount,
  });
}

/// Summary model for displaying reconciliation list
class ReconciliationSummary {
  final BankReconciliation reconciliation;
  final Account account;
  final int reconciledCount;

  ReconciliationSummary({
    required this.reconciliation,
    required this.account,
    required this.reconciledCount,
  });
}

/// Model for unreconciled transactions with selection state
class UnreconciledTransaction {
  final Transaction transaction;
  final double amount;
  final String? description;
  bool isSelected;

  UnreconciledTransaction({
    required this.transaction,
    required this.amount,
    this.description,
    this.isSelected = false,
  });
}

class BankReconciliationRepository {
  final AppDatabase _db;
  static const _uuid = Uuid();

  BankReconciliationRepository(this._db);

  /// 1. Simulate fetching imported bank API transactions
  Future<List<BankTransaction>> getPendingBankTransactions() async {
    // In a real app, this would query a table 'ImportedBankTransactions'
    // For now, we return dummy data for the Tinder UI
    return [
      BankTransaction(
        id: 'bt-001',
        date: DateTime.now().subtract(const Duration(days: 1)),
        description: 'Starbucks Coffee',
        amount: -15.50,
      ),
      BankTransaction(
        id: 'bt-002',
        date: DateTime.now().subtract(const Duration(days: 2)),
        description: 'Uber Ride',
        amount: -45.00,
      ),
      BankTransaction(
        id: 'bt-003',
        date: DateTime.now().subtract(const Duration(days: 3)),
        description: 'Client Payment Ref #999',
        amount: 1500.00,
      ),
      BankTransaction(
        id: 'bt-004',
        date: DateTime.now().subtract(const Duration(days: 5)),
        description: 'Amazon AWS S3',
        amount: -120.00,
      ),
    ];
  }

  /// 2. Find potential matches in the system (Logic: Amount +/- 0.01 and Date +/- 5 days)
  Future<List<Transaction>> findPotentialMatches(BankTransaction item) async {
    // Logic: Find system transactions with similar amount
    final amount = item.amount;
    final start = item.date.subtract(const Duration(days: 5));
    final end = item.date.add(const Duration(days: 5));

    // Note: In real app, we need to handle currency conversions.
    // Assuming local currency for now.

    // Query Logic:
    // Select T.* from Transactions T
    // Join TransactionEntries TE on TE.transactionId = T.id
    // Where TE.amount matches item.amount

    // We'll filter in Dart for simplicity in this prototype phase
    final allTransactions = await _db.select(_db.transactions).get();

    // Get entries for these transactions to check amounts
    final matches = <Transaction>[];

    for (var txn in allTransactions) {
      // Date Check
      if (txn.transactionDate.isBefore(start) ||
          txn.transactionDate.isAfter(end)) {
        continue;
      }

      final entries = await (_db.select(
        _db.transactionEntries,
      )..where((tbl) => tbl.transactionId.equals(txn.id))).get();

      // Amount Check
      // We look for any entry that matches the bank amount.
      // Bank Debit (-15) = System Credit to Cash (-15) OR System Debit to Expense (+15)?
      // Usually matching the 'Bank' ledger entry.
      // If Bank says -15 (money out), System Cash Account should have Credit 15.
      // So looking for Entry with amount = -1 * bankAmount (rough approximation for simple ledger)
      // OR mostly just matching the absolute value magnitude for "Smart Suggestions"

      final magnitude = amount.abs();
      final hasMatch = entries.any(
        (e) => (e.amount.abs() / 100 - magnitude).abs() < 0.1,
      );
      // / 100 because db stores cents, bankTransaction uses double for demo

      if (hasMatch) {
        matches.add(txn);
      }
    }

    return matches;
  }

  String? suggestCategory(String description) {
    return AutoCategorizationService().suggestCategory(description);
  }

  /// 3. Match Action
  Future<void> reconcile({
    required String bankTransactionId,
    required String systemTransactionId,
  }) async {
    // 1. Create a ReconciledTransaction record
    // 2. Mark imported transaction as matched
    // await _db.into(_db.reconciledTransactions).insert(...)
  }

  /// Watch all reconciliations with their associated account info
  Stream<List<ReconciliationSummary>> watchAllReconciliations() {
    final reconciliationsQuery = _db.select(_db.bankReconciliations)
      ..orderBy([(t) => OrderingTerm.desc(t.statementDate)]);

    return reconciliationsQuery.watch().asyncMap((reconciliations) async {
      final summaries = <ReconciliationSummary>[];

      for (final rec in reconciliations) {
        // Get the associated account
        final account = await (_db.select(
          _db.accounts,
        )..where((a) => a.id.equals(rec.accountId))).getSingleOrNull();

        if (account == null) continue;

        // Count reconciled transactions for this reconciliation
        final reconciledCount =
            await (_db.select(_db.reconciledTransactions)
                  ..where((r) => r.reconciliationId.equals(rec.id)))
                .get()
                .then((list) => list.length);

        summaries.add(
          ReconciliationSummary(
            reconciliation: rec,
            account: account,
            reconciledCount: reconciledCount,
          ),
        );
      }

      return summaries;
    });
  }

  /// Get all bank/cash type accounts available for reconciliation
  Future<List<Account>> getBankAccounts() async {
    return (_db.select(_db.accounts)..where(
          (a) => a.type.isIn(['Cash', 'Bank', 'cash', 'bank', 'CASH', 'BANK']),
        ))
        .get();
  }

  /// Create a new reconciliation session
  Future<String> createReconciliation({
    required String accountId,
    required DateTime statementDate,
    required int statementEndingBalance,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();

    await _db
        .into(_db.bankReconciliations)
        .insert(
          BankReconciliationsCompanion.insert(
            id: Value(id),
            accountId: accountId,
            statementDate: statementDate,
            statementEndingBalance: statementEndingBalance,
            status: const Value('draft'),
            createdAt: Value(now),
            lastUpdated: Value(now),
          ),
        );

    return id;
  }

  /// Get unreconciled transactions for an account
  Future<List<UnreconciledTransaction>> getUnreconciledTransactions(
    String accountId,
  ) async {
    // Get already reconciled transaction IDs
    final reconciledIds = await _db
        .select(_db.reconciledTransactions)
        .map((r) => r.transactionId)
        .get();

    // Get all transaction entries for this account that aren't reconciled
    final entries =
        await (_db.select(_db.transactionEntries).join([
                innerJoin(
                  _db.transactions,
                  _db.transactions.id.equalsExp(
                    _db.transactionEntries.transactionId,
                  ),
                ),
              ])
              ..where(
                _db.transactionEntries.accountId.equals(accountId) &
                    _db.transactionEntries.transactionId.isNotIn(reconciledIds),
              )
              ..orderBy([OrderingTerm.desc(_db.transactions.transactionDate)]))
            .get();

    final unreconciledList = <UnreconciledTransaction>[];
    for (final row in entries) {
      final txn = row.readTable(_db.transactions);
      final entry = row.readTable(_db.transactionEntries);

      unreconciledList.add(
        UnreconciledTransaction(
          transaction: txn,
          amount: entry.amount / 100.0, // Convert cents to dollars
          description: txn.description,
        ),
      );
    }

    return unreconciledList;
  }

  /// Get the current book balance for an account
  Future<double> getBookBalance(String accountId) async {
    // Sum all transaction entries for this account
    final entries = await (_db.select(
      _db.transactionEntries,
    )..where((e) => e.accountId.equals(accountId))).get();

    // Get account initial balance
    final account = await (_db.select(
      _db.accounts,
    )..where((a) => a.id.equals(accountId))).getSingleOrNull();

    final initialBalance = (account?.initialBalance ?? 0) / 100.0;
    final entriesTotal =
        entries.fold<int>(0, (sum, e) => sum + e.amount) / 100.0;

    return initialBalance + entriesTotal;
  }

  /// Reconcile selected transactions
  Future<void> reconcileTransactions({
    required String reconciliationId,
    required List<String> transactionIds,
  }) async {
    return _db.transaction(() async {
      final now = DateTime.now();

      // Mark transactions as reconciled
      for (final txnId in transactionIds) {
        await _db
            .into(_db.reconciledTransactions)
            .insert(
              ReconciledTransactionsCompanion.insert(
                id: Value(_uuid.v4()),
                reconciliationId: reconciliationId,
                transactionId: txnId,
                createdAt: Value(now),
                lastUpdated: Value(now),
              ),
            );
      }

      // Update reconciliation status to completed
      await (_db.update(
        _db.bankReconciliations,
      )..where((r) => r.id.equals(reconciliationId))).write(
        BankReconciliationsCompanion(
          status: const Value('completed'),
          lastUpdated: Value(now),
        ),
      );
    });
  }
}

final bankReconciliationRepositoryProvider =
    Provider<BankReconciliationRepository>((ref) {
      final db = ref.watch(appDatabaseProvider);
      return BankReconciliationRepository(db);
    });
