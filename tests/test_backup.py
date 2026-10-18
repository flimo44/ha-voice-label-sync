"""Regression tests for HACS PR review feedback."""
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from hvls.writers.filesystem import apply_backup_retention, write_with_backup

class BackupTests(unittest.TestCase):
    def test_second_generation_float_retention(self):
        with TemporaryDirectory() as d:
            output = Path(d) / 'ga.yaml'
            backups = Path(d) / 'backups'
            write_with_backup(output, 'one', backups, retention=10.0)
            result = write_with_backup(output, 'two', backups, retention=10.0)
            self.assertEqual(output.read_text(), 'two')
            self.assertIsNotNone(result.backup_path)
            self.assertEqual(len(list(backups.glob('*.bak'))), 1)

    def test_disable_backup(self):
        with TemporaryDirectory() as d:
            output = Path(d) / 'ga.yaml'
            backups = Path(d) / 'backups'
            output.write_text('one')
            result = write_with_backup(output, 'two', backups, retention=10, create_backup_enabled=False)
            self.assertIsNone(result.backup_path)
            self.assertFalse(backups.exists())
            self.assertEqual(output.read_text(), 'two')

    def test_retention_zero(self):
        with TemporaryDirectory() as d:
            output = Path(d) / 'ga.yaml'
            backups = Path(d) / 'backups'
            output.write_text('one')
            write_with_backup(output, 'two', backups, retention=0.0)
            self.assertEqual(list(backups.glob('*.bak')), [])

    def test_invalid_retention(self):
        with TemporaryDirectory() as d:
            with self.assertRaises(ValueError):
                apply_backup_retention(Path(d)/'ga.yaml', Path(d), 1.5)

if __name__ == '__main__':
    unittest.main()
